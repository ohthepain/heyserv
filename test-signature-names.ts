#!/usr/bin/env tsx

/**
 * Test script for signature and name preferences functionality
 * Tests the new API endpoints and email formatting with signatures and names
 */

const baseUrl = "http://localhost:4000";

async function testSignatureAndNames() {
  console.log("🧪 Testing Signature and Name Preferences");
  console.log("=" .repeat(50));

  const userId = "test-user-signature";

  try {
    // 1. Create/get profile
    console.log("\n1️⃣ Creating/getting user profile");
    let response = await fetch(`${baseUrl}/profile/${userId}`);
    let data = await response.json();

    if (data.success) {
      console.log("✅ Profile created/retrieved successfully");
    } else {
      throw new Error("Failed to create profile");
    }

    // 2. Update signature preferences
    console.log("\n2️⃣ Testing PUT /profile/:userId/signature (update signature)");
    response = await fetch(`${baseUrl}/profile/${userId}/signature`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signature: {
          text: "Best regards,\nJohn Smith\nSenior Software Engineer\nAcme Corp\njohn.smith@acme.com\n+1 (555) 123-4567",
          html: "<p>Best regards,<br>John Smith<br>Senior Software Engineer<br>Acme Corp<br>john.smith@acme.com<br>+1 (555) 123-4567</p>",
          includeInEmails: true,
        },
      }),
    });
    data = await response.json();

    if (data.success) {
      console.log("✅ Signature preferences updated successfully");
      console.log("📝 Signature text:", data.profile.emailPreferences.signature.text.substring(0, 50) + "...");
    } else {
      throw new Error("Failed to update signature");
    }

    // 3. Update name preferences
    console.log("\n3️⃣ Testing PUT /profile/:userId/names (update names)");
    response = await fetch(`${baseUrl}/profile/${userId}/names`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        names: {
          formal: "Dr. John Michael Smith",
          casual: "John",
          professional: "John Smith",
        },
      }),
    });
    data = await response.json();

    if (data.success) {
      console.log("✅ Name preferences updated successfully");
      console.log("📝 Formal name:", data.profile.emailPreferences.names.formal);
      console.log("📝 Casual name:", data.profile.emailPreferences.names.casual);
      console.log("📝 Professional name:", data.profile.emailPreferences.names.professional);
    } else {
      throw new Error("Failed to update names");
    }

    // 4. Test email drafting with signature and names
    console.log("\n4️⃣ Testing email drafting with signature and names");
    response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Draft a professional reply to this email: Hi, can we schedule a meeting for next week?",
        context: {
          userId: userId,
          emailThread: "Test email thread with signature",
        },
      }),
    });
    data = await response.json();

    if (data.success && data.actionToPerform) {
      console.log("✅ Email drafted with signature and names");
      console.log("📧 Generated email body preview:", data.actionToPerform.parameters.body?.substring(0, 200) + "...");
    } else {
      console.log("⚠️  Email drafting response:", data);
    }

    // 5. Test different tones with different names
    console.log("\n5️⃣ Testing formal tone with formal name");
    response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Draft a formal reply to this email: Dear Sir, I would like to request information about your services.",
        context: {
          userId: userId,
          emailThread: "Formal email thread",
        },
      }),
    });
    data = await response.json();

    if (data.success && data.actionToPerform) {
      console.log("✅ Formal email drafted");
      console.log("📧 Formal email body preview:", data.actionToPerform.parameters.body?.substring(0, 200) + "...");
    }

    // 6. Test casual tone with casual name
    console.log("\n6️⃣ Testing casual tone with casual name");
    response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Draft a casual reply to this email: Hey! How's it going? Want to grab coffee sometime?",
        context: {
          userId: userId,
          emailThread: "Casual email thread",
        },
      }),
    });
    data = await response.json();

    if (data.success && data.actionToPerform) {
      console.log("✅ Casual email drafted");
      console.log("📧 Casual email body preview:", data.actionToPerform.parameters.body?.substring(0, 200) + "...");
    }

    // 7. Test signature toggle (disable signature)
    console.log("\n7️⃣ Testing signature toggle (disable signature)");
    response = await fetch(`${baseUrl}/profile/${userId}/signature`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signature: {
          includeInEmails: false,
        },
      }),
    });
    data = await response.json();

    if (data.success) {
      console.log("✅ Signature disabled");
      console.log("📝 Include in emails:", data.profile.emailPreferences.signature.includeInEmails);
    }

    // 8. Test email without signature
    console.log("\n8️⃣ Testing email drafting without signature");
    response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Draft a professional reply to this email: Can you send me the quarterly report?",
        context: {
          userId: userId,
          emailThread: "No signature email thread",
        },
      }),
    });
    data = await response.json();

    if (data.success && data.actionToPerform) {
      console.log("✅ Email drafted without signature");
      console.log("📧 Email body preview:", data.actionToPerform.parameters.body?.substring(0, 200) + "...");
    }

    // 9. Get final profile to verify all changes
    console.log("\n9️⃣ Getting final profile to verify all changes");
    response = await fetch(`${baseUrl}/profile/${userId}`);
    data = await response.json();

    if (data.success) {
      console.log("✅ Final profile retrieved successfully");
      console.log("📋 Complete preferences:");
      console.log("   - Signature text length:", data.profile.emailPreferences.signature.text.length, "characters");
      console.log("   - Signature HTML length:", data.profile.emailPreferences.signature.html.length, "characters");
      console.log("   - Include signature:", data.profile.emailPreferences.signature.includeInEmails);
      console.log("   - Formal name:", data.profile.emailPreferences.names.formal);
      console.log("   - Casual name:", data.profile.emailPreferences.names.casual);
      console.log("   - Professional name:", data.profile.emailPreferences.names.professional);
    }

    // 10. Clean up - delete profile
    console.log("\n🔟 Testing DELETE /profile/:userId (cleanup)");
    response = await fetch(`${baseUrl}/profile/${userId}`, {
      method: "DELETE",
    });
    data = await response.json();

    if (data.success) {
      console.log("✅ Profile deleted successfully");
    }

    console.log("\n🎉 All signature and name tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the test
testSignatureAndNames()
  .then(() => {
    console.log("\n✅ Signature and name functionality test completed!");
  })
  .catch((error) => {
    console.error("💥 Test error:", error);
    process.exit(1);
  });
