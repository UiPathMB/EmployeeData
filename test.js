import { handler } from "./index.js";

const mockEvent = {}; 

handler(mockEvent)
  .then((result) => {
    console.log("Lambda output:");
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error("Error running Lambda:", err);
  });
