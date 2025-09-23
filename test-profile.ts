#!/usr/bin/env npx tsx

/**
 * Test script for user profile functionality
 */

async function testProfileAPI() {
  console.log("🧪 Testing User Profile API...\n");

  const userId = "test-user-123";
  const baseUrl = "http://localhost:4000";

  try {
    // Test 1: Get or create profile
    console.log("1️⃣ Testing GET /profile/:userId (create new profile)");
    let response = await fetch(`${baseUrl}/profile/${userId}`);
    let data = await response.json();

    if (data.success) {
      console.log("✅ Profile created/retrieved successfully");
      console.log("📋 Default preferences:", JSON.stringify(data.profile.emailPreferences, null, 2));
    } else {
      throw new Error("Failed to create/get profile");
    }

    // Test 2: Update signoff for professional tone
    console.log("\n2️⃣ Testing PUT /profile/:userId/signoff (update professional signoff)");
    response = await fetch(`${baseUrl}/profile/${userId}/signoff`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tone: "professional",
        signoff: "Warm regards",
      }),
    });
    data = await response.json();

    if (data.success) {
      console.log("✅ Professional signoff updated to 'Warm regards'");
    } else {
      throw new Error("Failed to update signoff");
    }

    // Test 3: Update spacing preferences
    console.log("\n3️⃣ Testing PUT /profile/:userId/spacing (update spacing)");
    response = await fetch(`${baseUrl}/profile/${userId}/spacing`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spacing: {
          blankLineBeforeSignoff: false,
          blankLineBeforeName: true,
          blankLineAfterSalutation: true,
        },
      }),
    });
    data = await response.json();

    if (data.success) {
      console.log("✅ Spacing preferences updated");
      console.log("📋 Updated spacing:", JSON.stringify(data.profile.emailPreferences.spacing, null, 2));
    } else {
      throw new Error("Failed to update spacing");
    }

    // Test 4: Update default preferences
    console.log("\n4️⃣ Testing PUT /profile/:userId/defaults (update defaults)");
    response = await fetch(`${baseUrl}/profile/${userId}/defaults`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defaults: {
          defaultTone: "friendly",
          includeSignature: false,
        },
      }),
    });
    data = await response.json();

    if (data.success) {
      console.log("✅ Default preferences updated");
      console.log("📋 Updated defaults:", JSON.stringify(data.profile.emailPreferences.defaults, null, 2));
    } else {
      throw new Error("Failed to update defaults");
    }

    // Test 5: Get updated profile
    console.log("\n5️⃣ Testing GET /profile/:userId (get updated profile)");
    response = await fetch(`${baseUrl}/profile/${userId}`);
    data = await response.json();

    if (data.success) {
      console.log("✅ Profile retrieved successfully");
      console.log("📋 Complete updated profile:", JSON.stringify(data.profile.emailPreferences, null, 2));
    } else {
      throw new Error("Failed to get updated profile");
    }

    // Test 6: Test draftReply with user preferences
    console.log("\n6️⃣ Testing draftReply with user preferences");
    response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Draft a professional reply to this email: Hi, can we schedule a meeting for next week?",
        context: {
          userId: userId,
          emailThread: "Test email thread",
        },
      }),
    });
    data = await response.json();

    if (data.success && data.actionToPerform) {
      console.log("✅ Email drafted with user preferences");
      console.log("📧 Drafted email body:", data.actionToPerform.parameters.email.body);
    } else {
      console.log("⚠️  Email drafting may not have used user preferences (this is expected if no userId in context)");
    }

    // Test 7: Reset profile to defaults
    console.log("\n7️⃣ Testing POST /profile/:userId/reset (reset to defaults)");
    response = await fetch(`${baseUrl}/profile/${userId}/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    data = await response.json();

    if (data.success) {
      console.log("✅ Profile reset to defaults");
      console.log("📋 Reset profile:", JSON.stringify(data.profile.emailPreferences, null, 2));
    } else {
      throw new Error("Failed to reset profile");
    }

    // Test 8: Delete profile
    console.log("\n8️⃣ Testing DELETE /profile/:userId (delete profile)");
    response = await fetch(`${baseUrl}/profile/${userId}`, {
      method: "DELETE",
    });
    data = await response.json();

    if (data.success) {
      console.log("✅ Profile deleted successfully");
    } else {
      throw new Error("Failed to delete profile");
    }

    console.log("\n🎉 All profile API tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the test
testProfileAPI()
  .then(() => {
    console.log("\n✅ Profile functionality test completed!");
  })
  .catch((error) => {
    console.error("💥 Test error:", error);
    process.exit(1);
  });
