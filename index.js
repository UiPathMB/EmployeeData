import fetch from "node-fetch";
import 'dotenv/config';


export const handler = async () => {
  const API_URL = "https://dummy.restapiexample.com/api/v1/employees";

  // Environment variables (set in AWS Lambda console)
  const {
    UIPATH_ORCH_URL,
    UIPATH_TENANT_NAME,
    UIPATH_ACCOUNT_LOGICAL_NAME,
    UIPATH_CLIENT_ID,
    UIPATH_USER_KEY,
  } = process.env;

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const json = await response.json();

    const employees = json.data.map((emp) => ({
      id: emp.id,
      name: emp.employee_name,
      salary: Number(emp.employee_salary),
      age: Number(emp.employee_age),
    }));

    const authResponse = await fetch(`https://cloud.uipath.com/identity_/connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: UIPATH_CLIENT_ID,
        client_secret: UIPATH_USER_KEY,
        scope: "OR.Queues OR.Execution",
      }),
    });

    const authData = await authResponse.json();

    const accessToken = authData.access_token;
    if (!accessToken) throw new Error("Failed to authenticate with UiPath.");

    for (const emp of employees) {
      let priority = "Low";
      if (emp.salary > 300000) priority = "High";
      else if (emp.salary >= 100000 && emp.salary <= 300000) priority = "Normal";

      const queueItem = {
        itemData: {
          Name: "New Hires",
          Priority: priority,
          SpecificContent: {
            id: emp.id,
            name: emp.name,
            salary: emp.salary,
            age: emp.age,
          },
        },
      };

      // const queueUrl = `${UIPATH_ORCH_URL}/${UIPATH_ACCOUNT_LOGICAL_NAME}/${UIPATH_TENANT_NAME}/odata/Queues/UiPathODataSvc.AddQueueItem`;
      const queueUrl = `${UIPATH_ORCH_URL}/${UIPATH_ACCOUNT_LOGICAL_NAME}/${UIPATH_TENANT_NAME}/orchestrator_/odata/Queues/UiPathODataSvc.AddQueueItem`;
      console.log(queueUrl)
      const addResponse = await fetch(queueUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-UiPath-OrganizationUnitId": 211475
        },
        body: JSON.stringify(queueItem),
      });


      if (!addResponse.ok) {
        const err = await addResponse.text();
        console.error(`Failed to add employee ${emp.name}:`, err);
      } else {
        console.log(`Added employee: ${emp.name} (${priority})`);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "All employees processed and added to 'New Hires' queue.",
        totalEmployees: employees.length,
      }),
    };
  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
