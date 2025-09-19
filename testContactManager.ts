import fetch from "node-fetch";

const MCP_ENDPOINT = "http://localhost:4000/mcp";

async function sendMcpRequest(method: string, params: any, id: number) {
  const response = await fetch(MCP_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params,
    }),
  });
  return response.json();
}

async function testContactManager() {
  console.log("🧪 Testing Contact Manager Tool\n");
  console.log("=".repeat(80));

  try {
    // 1. Initialize MCP Connection
    console.log("\n🔌 1. INITIALIZING MCP CONNECTION");
    console.log("-".repeat(40));
    const initResponse = await sendMcpRequest("initialize", {}, 1001);
    console.log("Init Response:", JSON.stringify(initResponse, null, 2));

    // 2. List Available Tools
    console.log("\n📋 2. LISTING AVAILABLE TOOLS");
    console.log("-".repeat(40));
    const toolsResponse = await sendMcpRequest("tools/list", {}, 1002);
    console.log("Tools Response:", JSON.stringify(toolsResponse, null, 2));

    // 3. Create a contact
    console.log("\n👤 3. CREATING A CONTACT");
    console.log("-".repeat(40));
    const createContactResponse = await sendMcpRequest(
      "tools/call",
      {
        name: "contactManager",
        arguments: {
          action: "create",
          email: "test@example.com",
          name: "Test User",
          avatar: "https://example.com/avatar.jpg",
        },
      },
      1003
    );
    console.log("Create Contact Response:", JSON.stringify(createContactResponse, null, 2));

    // 4. Get the contact
    console.log("\n🔍 4. GETTING THE CONTACT");
    console.log("-".repeat(40));
    const getContactResponse = await sendMcpRequest(
      "tools/call",
      {
        name: "contactManager",
        arguments: {
          action: "get",
          email: "test@example.com",
        },
      },
      1004
    );
    console.log("Get Contact Response:", JSON.stringify(getContactResponse, null, 2));

    // 5. List all contacts
    console.log("\n📝 5. LISTING ALL CONTACTS");
    console.log("-".repeat(40));
    const listContactsResponse = await sendMcpRequest(
      "tools/call",
      {
        name: "contactManager",
        arguments: {
          action: "list",
          limit: 10,
        },
      },
      1005
    );
    console.log("List Contacts Response:", JSON.stringify(listContactsResponse, null, 2));

    // 6. Get global stats
    console.log("\n📊 6. GETTING GLOBAL STATS");
    console.log("-".repeat(40));
    const globalStatsResponse = await sendMcpRequest(
      "tools/call",
      {
        name: "contactManager",
        arguments: {
          action: "globalStats",
        },
      },
      1006
    );
    console.log("Global Stats Response:", JSON.stringify(globalStatsResponse, null, 2));

    // 7. Create a memory for the contact
    console.log("\n🧠 7. CREATING A MEMORY");
    console.log("-".repeat(40));
    const createMemoryResponse = await sendMcpRequest(
      "tools/call",
      {
        name: "contactManager",
        arguments: {
          action: "createMemory",
          email: "test@example.com",
          text: "This is a test memory for the contact",
          memoryType: "important_info",
          priority: 3,
        },
      },
      1007
    );
    console.log("Create Memory Response:", JSON.stringify(createMemoryResponse, null, 2));

    // 8. Get contact memories
    console.log("\n📚 8. GETTING CONTACT MEMORIES");
    console.log("-".repeat(40));
    const getMemoriesResponse = await sendMcpRequest(
      "tools/call",
      {
        name: "contactManager",
        arguments: {
          action: "memories",
          email: "test@example.com",
        },
      },
      1008
    );
    console.log("Get Memories Response:", JSON.stringify(getMemoriesResponse, null, 2));

    // 9. Search contacts
    console.log("\n🔎 9. SEARCHING CONTACTS");
    console.log("-".repeat(40));
    const searchContactsResponse = await sendMcpRequest(
      "tools/call",
      {
        name: "contactManager",
        arguments: {
          action: "search",
          query: "test",
          limit: 10,
        },
      },
      1009
    );
    console.log("Search Contacts Response:", JSON.stringify(searchContactsResponse, null, 2));

    console.log("\n" + "=".repeat(80));
    console.log("✅ All contact manager tests completed successfully!");
  } catch (error) {
    console.error("❌ Error testing contact manager:", error);
    process.exit(1);
  }
}

// Run the tests
testContactManager().catch(console.error);
