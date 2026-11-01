package migrations

import (
	"strings"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	m "ganigeorgiev.com/pocketbase/pocketbase/migrations"
)

// festive wraps content in a Christmas-themed, email-client-safe layout
// (table based, inline styles only). {APP_NAME}/{OTP}/... are PocketBase
// placeholders resolved at send time.
func festive(heading, content string) string {
	r := strings.NewReplacer("%HEADING%", heading, "%CONTENT%", content)
	return r.Replace(`
<div style="margin:0;padding:24px 12px;background-color:#f6efe6;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;border:3px solid #165b33;">
    <tr>
      <td align="center" style="background-color:#165b33;padding:28px 24px 20px;color:#ffffff;">
        <div style="font-size:20px;letter-spacing:10px;line-height:1.4;">🎄 ✨ 🎁 ✨ 🎄</div>
        <div style="font-size:30px;font-weight:bold;margin-top:8px;">🎅 {APP_NAME}</div>
        <div style="font-size:14px;color:#f8d98a;font-style:italic;margin-top:4px;">Your guide to Christmas markets</div>
      </td>
    </tr>
    <tr>
      <td style="background-color:#b3202a;height:8px;line-height:8px;font-size:0;">&nbsp;</td>
    </tr>
    <tr>
      <td style="padding:32px 28px 8px;color:#3b2a20;font-size:16px;line-height:1.6;">
        <h1 style="margin:0 0 12px;font-size:24px;color:#b3202a;text-align:center;">%HEADING%</h1>
        %CONTENT%
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:8px 28px 28px;color:#3b2a20;font-size:15px;line-height:1.6;">
        <div style="font-size:18px;letter-spacing:6px;">❄️ 🍪 ☕ 🕯️ ❄️</div>
        <p style="margin:12px 0 0;">Frohe Weihnachten &amp; happy market-hopping!<br>
        <span style="color:#165b33;font-weight:bold;">The {APP_NAME} elves 🧝</span></p>
      </td>
    </tr>
    <tr>
      <td align="center" style="background-color:#165b33;padding:12px;color:#f8d98a;font-size:12px;">
        🎶 Glühwein, lights &amp; good company 🎶
      </td>
    </tr>
  </table>
</div>`)
}

func updateTemplates(app core.App, otp, alert *core.EmailTemplate) error {
	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return err
	}
	if otp != nil {
		users.OTP.EmailTemplate = *otp
	}
	if alert != nil {
		users.AuthAlert.EmailTemplate = *alert
	}
	return app.Save(users)
}

// Festive email templates for the users collection (OTP login code and the
// new-location login alert). Down restores PocketBase's stock templates.
func init() {
	m.Register(func(app core.App) error {
		otp := core.EmailTemplate{
			Subject: "🎄 Your {APP_NAME} secret code is here!",
			Body: festive("Ho ho ho! Here's your code 🎁", `
        <p style="margin:0 0 16px;text-align:center;">Santa's elves have wrapped up your one-time password. Pop it in to unlock the markets:</p>
        <div style="text-align:center;margin:20px 0;">
          <span style="display:inline-block;padding:14px 28px;background-color:#fff8e7;border:3px dashed #b3202a;border-radius:12px;font-family:'Courier New',monospace;font-size:36px;font-weight:bold;letter-spacing:10px;color:#165b33;">{OTP}</span>
        </div>
        <p style="margin:0 0 16px;text-align:center;font-size:14px;color:#7a6455;">⏰ It melts away like a snowflake soon, so use it quickly!</p>
        <p style="margin:0 0 16px;text-align:center;font-size:14px;color:#7a6455;">Didn't ask for this? No worries — just ignore this email. You're still on the nice list. 😇</p>`),
		}
		alert := core.EmailTemplate{
			Subject: "🎅 New login to your {APP_NAME} account",
			Body: festive("Someone's been sneaking around! 🕵️", `
        <p style="margin:0 0 12px;text-align:center;">We spotted a login to your {APP_NAME} account from a new location:</p>
        <p style="margin:0 0 16px;padding:12px;background-color:#fff8e7;border-left:4px solid #b3202a;border-radius:6px;"><em>{ALERT_INFO}</em></p>
        <p style="margin:0 0 16px;font-weight:bold;color:#b3202a;">If this wasn't you, please change your account password right away to log out all other locations. 🔒</p>`),
		}
		return updateTemplates(app, &otp, &alert)
	}, func(app core.App) error {
		stock := core.NewAuthCollection("tmp")
		return updateTemplates(app, &stock.OTP.EmailTemplate, &stock.AuthAlert.EmailTemplate)
	})
}
