export default {
    async fetch(request, env) {
      // --- Handle CORS preflight ---
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        });
      }
  
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }
  
      const debugLogs = [];
  
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response("Invalid JSON", { status: 400 });
      }
  
      const url = new URL(request.url);
      const mode = url.searchParams.get("mode") || "accounts";
  
      // --- Helper: Refresh QuickBooks Token and update KV ---
      async function getAccessToken(env, company) {
        let refreshToken = await env.QB_TOKENS.get(company.refreshTokenKey);
        if (!refreshToken) throw new Error("No refresh token for " + company.name);
      
        const clientId = await env.QB_TOKENS.get(company.clientIdKey);
        const clientSecret = await env.QB_TOKENS.get(company.clientSecretKey);
      
        if (!clientId || !clientSecret)
          throw new Error("Missing clientId/clientSecret for " + company.name);
      
        const tokenResponse = await fetch(
          "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
          {
            method: "POST",
            headers: {
              Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: refreshToken,
            }),
          }
        );
      
        const tokenData = await tokenResponse.json();
      
        if (!tokenData.access_token)
          throw new Error("Failed to get access token: " + JSON.stringify(tokenData));
      
        // Save updated refresh token
        if (tokenData.refresh_token && tokenData.refresh_token !== refreshToken) {
          await env.QB_TOKENS.put(company.refreshTokenKey, tokenData.refresh_token);
        }
      
        return tokenData.access_token;
      }
      
  
      // --- Helper: Get Accounts ---
      async function getAccounts(accessToken, realmId) {
        const queryUrl = `https://quickbooks.api.intuit.com/v3/company/${realmId}/query?query=select * from Account startposition 1 maxresults 1000`;
        const res = await fetch(queryUrl, {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        });
        const data = await res.json();
        return data.QueryResponse?.Account || [];
      }
  
      // --- Helper: Get Reports ---
      async function getReport(accessToken, realmId, accountId, startDate, endDate) {
        debugLogs.push({ action: "getReport called", realmId, accountId, startDate, endDate });
  
        const url = `https://quickbooks.api.intuit.com/v3/company/${realmId}/reports/GeneralLedger?account=${accountId}&columns=currency,debt_home_amt,credit_home_amt,tx_date,txn_type,memo,exch_rate&start_date=${startDate}&end_date=${endDate}`;
        const res = await fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        });
        return res.json();
      }
  
      // --- Define Companies ---
      const companies = [
        {
          name: "TST-ME",
          realmIdKey: "TST-ME-REALM-ID",
          refreshTokenKey: "TST-ME-REFRESH-TOKEN",
          clientIdKey: "CLIENT_ID",
          clientSecretKey: "CLIENT_SECRET"
        },
        {
          name: "TST-ENT",
          realmIdKey: "TST-ENT-REALM-ID",
          refreshTokenKey: "TST-ENT-REFRESH-TOKEN",
          clientIdKey: "CLIENT_ID",
          clientSecretKey: "CLIENT_SECRET"
        },
        {
          name: "ACNA",
          realmIdKey: "TST-ACNA-REALM-ID",
          refreshTokenKey: "TST-ACNA-REFRESH-TOKEN",
          clientIdKey: "ACNA-CLIENT-ID",
          clientSecretKey: "ACNA-CLIENT-SECRET"
        }
      ];
      
  
      try {
        if (mode === "accounts") {
          const results = [];
          for (const company of companies) {
            const accessToken = await getAccessToken(env, company);
            const realmId = await env.QB_TOKENS.get(company.realmIdKey);
            const accounts = await getAccounts(accessToken, realmId);
            results.push({ companyName: company.name, realmId, accounts });
          }
          return new Response(JSON.stringify({ companies: results, debugLogs }, null, 2), {
            status: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }
  
        // --- MODE: POST REPORTS ---
        if (mode === "reports") {
          const { accountIds, startDate, endDate } = body;
          if (!accountIds || !startDate || !endDate)
            return new Response("Missing parameters", { status: 400 });
  
          const mergedReports = [];
  
          for (const company of companies) {
            const accessToken = await getAccessToken(env, company);
            const realmId = await env.QB_TOKENS.get(company.realmIdKey);
          
            const accountsResponse = await getAccounts(accessToken, realmId);
          
            // Only IDs for this company
            const accountIdsForThisCompany = accountIds
    .filter(a => a.companyName === company.name)
    .map(a => Number(a.accountId));
          
            const accountsToFetch = accountsResponse.filter(acc =>
              accountIdsForThisCompany.includes(Number(acc.Id))
            );
          
            for (const acc of accountsToFetch) {
              const reportData = await getReport(accessToken, realmId, acc.Id, startDate, endDate);
              mergedReports.push({
                companyName: company.name,
                accountId: acc.Id,
                accountName: acc.Name,
                reportData,
              });
            }
          }
          
  
          return new Response(JSON.stringify({ mergedReports, debugLogs }, null, 2), {
            status: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }
  
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    },
  };
  