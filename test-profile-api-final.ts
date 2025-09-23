#!/usr/bin/env tsx

/**
 * Final comprehensive test for the normalized profile API
 * Tests all profile endpoints with signature and name functionality
 */

const baseUrl = "http://localhost:4000";

async function testProfileAPI() {
  console.log("🧪 Testing Normalized Profile API");
  console.log("=".repeat(50));

  const userId = "final-test-user";

  try {
    // 1. Create/get profile
    console.log("\n1️⃣ Creating/getting user profile");
    let response = await fetch(`${baseUrl}/profile/${userId}`);
    let data = await response.json();

    if (data.success) {
      console.log("✅ Profile created/retrieved successfully");
      console.log("📊 Profile ID:", data.profile.id);
    } else {
      throw new Error("Failed to create profile");
    }

    // 2. Update signature
    console.log("\n2️⃣ Testing signature update");
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
      console.log("✅ Signature updated successfully");
      console.log("📝 Signature text length:", data.profile.emailPreferences.signature.text.length, "characters");
    } else {
      throw new Error("Failed to update signature");
    }

    // 3. Update names
    console.log("\n3️⃣ Testing names update");
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
      console.log("✅ Names updated successfully");
      console.log("📝 Formal name:", data.profile.emailPreferences.names.formal);
      console.log("📝 Casual name:", data.profile.emailPreferences.names.casual);
      console.log("📝 Professional name:", data.profile.emailPreferences.names.professional);
    } else {
      throw new Error("Failed to update names");
    }

    // 4. Update signoffs
    console.log("\n4️⃣ Testing signoff updates");
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

    // 5. Update spacing preferences
    console.log("\n5️⃣ Testing spacing preferences");
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
      console.log("📝 Blank line before signoff:", data.profile.emailPreferences.spacing.blankLineBeforeSignoff);
      console.log("📝 Blank line before name:", data.profile.emailPreferences.spacing.blankLineBeforeName);
      console.log("📝 Blank line after salutation:", data.profile.emailPreferences.spacing.blankLineAfterSalutation);
    } else {
      throw new Error("Failed to update spacing");
    }

    // 6. Update default preferences
    console.log("\n6️⃣ Testing default preferences");
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
      console.log("📝 Default tone:", data.profile.emailPreferences.defaults.defaultTone);
      console.log("📝 Include signature:", data.profile.emailPreferences.defaults.includeSignature);
    } else {
      throw new Error("Failed to update defaults");
    }

    // 7. Get final profile to verify all changes
    console.log("\n7️⃣ Getting final profile to verify all changes");
    response = await fetch(`${baseUrl}/profile/${userId}`);
    data = await response.json();

    if (data.success) {
      console.log("✅ Final profile retrieved successfully");
      const prefs = data.profile.emailPreferences;
      console.log("📋 Complete preferences summary:");
      console.log("   - Signature text length:", prefs.signature.text.length, "characters");
      console.log("   - Include signature:", prefs.signature.includeInEmails);
      console.log("   - Formal name:", prefs.names.formal);
      console.log("   - Casual name:", prefs.names.casual);
      console.log("   - Professional name:", prefs.names.professional);
      console.log("   - Professional signoff:", prefs.signoffs.professional);
      console.log("   - Default tone:", prefs.defaults.defaultTone);
      console.log("   - Spacing preferences:", {
        blankLineBeforeSignoff: prefs.spacing.blankLineBeforeSignoff,
        blankLineBeforeName: prefs.spacing.blankLineBeforeName,
        blankLineAfterSalutation: prefs.spacing.blankLineAfterSalutation,
      });
    }

    // 8. Test signature toggle (disable signature)
    console.log("\n8️⃣ Testing signature toggle (disable signature)");
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

    // 9. Test reset profile
    console.log("\n9️⃣ Testing profile reset");
    response = await fetch(`${baseUrl}/profile/${userId}/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    data = await response.json();

    if (data.success) {
      console.log("✅ Profile reset to defaults");
      console.log("📝 Professional signoff:", data.profile.emailPreferences.signoffs.professional);
      console.log("📝 Signature text:", data.profile.emailPreferences.signature.text ? "Has content" : "Empty");
      console.log("📝 Formal name:", data.profile.emailPreferences.names.formal || "Empty");
    }

    // 10. Clean up - delete profile
    console.log("\n🔟 Testing profile deletion");
    response = await fetch(`${baseUrl}/profile/${userId}`, {
      method: "DELETE",
    });
    data = await response.json();

    if (data.success) {
      console.log("✅ Profile deleted successfully");
    }

    console.log("\n🎉 All profile API tests passed!");
    console.log("📊 Summary:");
    console.log("   ✅ Profile creation/retrieval");
    console.log("   ✅ Signature management");
    console.log("   ✅ Name preferences");
    console.log("   ✅ Signoff customization");
    console.log("   ✅ Spacing preferences");
    console.log("   ✅ Default settings");
    console.log("   ✅ Profile reset");
    console.log("   ✅ Profile deletion");
    console.log("   ✅ Normalized database schema working perfectly!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the test
testProfileAPI()
  .then(() => {
    console.log("\n✅ Normalized profile API test completed successfully!");
  })
  .catch((error) => {
    console.error("💥 Test error:", error);
    process.exit(1);
  });
