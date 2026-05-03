"""HTML email templates for RS Recruiting transactional emails."""

_COPPER = "#B87333"
_COPPER_DARK = "#9A6128"
_BG = "#f5f4f2"
_CARD = "#ffffff"
_TEXT = "#2d2d2d"
_MUTED = "#666666"
_BORDER = "#e0ddd9"

_BASE = """<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{subject}</title>
</head>
<body style="margin:0;padding:0;background:{bg};
             font-family:Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0"
         style="background:{bg};padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:{card};border-radius:8px;border:1px solid {border};
                      overflow:hidden;max-width:560px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:{copper};padding:24px 32px;">
              <span style="font-size:22px;font-weight:bold;color:#ffffff;
                           letter-spacing:2px;">RS</span>
              <span style="font-size:14px;color:rgba(255,255,255,0.80);
                           margin-right:8px;">ייעוץ</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              {body_html}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid {border};
                       background:{bg};text-align:center;">
              <p style="margin:0;font-size:12px;color:{muted};">
                RS ייעוץ · רח׳ האלונים 12, נתניה
              </p>
              <p style="margin:4px 0 0;font-size:12px;color:{muted};">
                <a href="tel:052-5989559"
                   style="color:{muted};text-decoration:none;">052-5989559</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _wrap(subject: str, body_html: str) -> str:
    return _BASE.format(
        subject=subject,
        bg=_BG,
        card=_CARD,
        border=_BORDER,
        copper=_COPPER,
        muted=_MUTED,
        body_html=body_html,
    )


def _cta_button(url: str, label: str) -> str:
    return (
        f'<table cellpadding="0" cellspacing="0" style="margin:28px 0;">'
        f'<tr><td align="center">'
        f'<a href="{url}" target="_blank"'
        f'   style="display:inline-block;background:{_COPPER};color:#ffffff;'
        f"          text-decoration:none;font-size:15px;font-weight:bold;"
        f'          padding:14px 32px;border-radius:4px;">'
        f"{label}"
        f"</a>"
        f"</td></tr></table>"
    )


def build_invite_html(registration_url: str, contact_name: str | None = None) -> str:
    """HTML invite email sent to companies when admin creates an invite."""
    greeting = f"שלום {contact_name}," if contact_name else "שלום,"
    p_style = f"margin:0 0 12px;font-size:15px;color:{_TEXT};line-height:1.6;"
    h2_style = f"margin:0 0 16px;font-size:20px;color:{_TEXT};"
    title = "הזמנה להצטרפות לפלטפורמת RS"
    body = (
        f'<h2 style="{h2_style}">{title}</h2>'
        f'<p style="{p_style}">{greeting}</p>'
        f'<p style="{p_style}">'
        "הוזמנת להירשם לפלטפורמת RS Recruiting "
        "ולהתחיל לפרסם משרות ולקבל מועמדים."
        "</p>"
        f'<p style="margin:0 0 4px;font-size:15px;color:{_TEXT};line-height:1.6;">'
        "לחצו על הכפתור למטה להשלמת תהליך ההרשמה:"
        "</p>"
        f"{_cta_button(registration_url, 'השלמת תהליך ההרשמה')}"
        f'<p style="margin:0;font-size:13px;color:{_MUTED};">'
        "הקישור תקף ל-48 שעות בלבד."
        "</p>"
    )
    return _wrap("הזמנה להרשמה ל-RS Recruiting", body)


def build_approval_html(company_name: str, activation_url: str) -> str:
    """HTML approval email sent after admin approves a company registration."""
    p_style = f"margin:0 0 12px;font-size:15px;color:{_TEXT};line-height:1.6;"
    h2_style = f"margin:0 0 16px;font-size:20px;color:{_TEXT};"
    body = (
        f'<h2 style="{h2_style}">הבקשה שלכם אושרה!</h2>'
        f'<p style="{p_style}">שלום,</p>'
        f'<p style="{p_style}">'
        f"בקשת ההרשמה של <strong>{company_name}</strong> "
        "לפלטפורמת RS Recruiting אושרה."
        "</p>"
        f'<p style="margin:0 0 4px;font-size:15px;color:{_TEXT};line-height:1.6;">'
        "לחצו על הכפתור להפעלת החשבון ותחילת השימוש בפלטפורמה:"
        "</p>"
        f"{_cta_button(activation_url, 'הפעלת החשבון')}"
        f'<p style="margin:0 0 12px;font-size:13px;color:{_MUTED};">'
        "מצורף לאימייל זה החוזה החתום עם כל פרטי ההסכם."
        "</p>"
        f'<p style="margin:0;font-size:13px;color:{_MUTED};">'
        "לאחר לחיצה על הכפתור תוכלו להתחבר ולהתחיל לפרסם משרות."
        "</p>"
    )
    return _wrap("בקשת ההרשמה שלכם אושרה – RS Recruiting", body)
