"""HTML email templates for RS Recruiting transactional emails.

Brand: dark luxury boutique. Minimal surfaces, warm metallic accents.
Color references match the Tailwind token system in index.css.
"""

# Dark surfaces
_VOID = "#0D0B09"  # outer background
_CARD = "#1A1816"  # card surface
_WELL = "#141210"  # sunken / header band
_BORDER = "#302C28"  # white/8 equivalent

# Brand metals
_COPPER = "#B87333"
_GOLD = "#C9A84C"

# Text
_TEXT_HI = "#E0DCDB"
_TEXT_MID = "#999693"
_TEXT_LO = "#6B6866"

_BASE = """\
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{subject}</title>
</head>
<body style="margin:0;padding:0;background:{void};
             font-family:Georgia,'Times New Roman',serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0"
         style="background:{void};padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:{card};border-radius:4px;
                      border:1px solid {border};
                      max-width:520px;width:100%;
                      overflow:hidden;">

          <!-- header band -->
          <tr>
            <td bgcolor="{well}" style="background:{well};padding:24px 36px;
                       border-bottom:1px solid {border};">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-left:0;padding-right:12px;">
                    <img src="{logo_url}"
                         alt="RS" width="32" height="32"
                         style="display:block;border-radius:2px;">
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:11px;font-weight:600;
                                 letter-spacing:4px;text-transform:uppercase;
                                 color:{copper};">RS Recruiting</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- body -->
          <tr>
            <td style="padding:36px;">
              {body_html}
            </td>
          </tr>

          <!-- footer -->
          <tr>
            <td style="padding:20px 36px;border-top:1px solid {border};">
              <p style="margin:0;font-size:11px;letter-spacing:1px;
                        color:{lo};">
                <a href="mailto:support@rs-recruiting.com"
                   style="color:{lo};text-decoration:none;">support@rs-recruiting.com</a>
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
    from src.core.infrastructure.config import settings

    logo_url = f"{settings.frontend_base_url}/logo.png"
    return _BASE.format(
        subject=subject,
        void=_VOID,
        card=_CARD,
        well=_WELL,
        border=_BORDER,
        copper=_COPPER,
        lo=_TEXT_LO,
        logo_url=logo_url,
        body_html=body_html,
    )


def _cta(url: str, label: str) -> str:
    return (
        f'<table cellpadding="0" cellspacing="0" style="margin:32px 0 0;">'
        f"<tr><td>"
        f'<a href="{url}" target="_blank"'
        f'   style="display:inline-block;background:{_COPPER};'
        f"          color:#ffffff;text-decoration:none;"
        f"          font-family:Arial,sans-serif;font-size:13px;"
        f"          font-weight:600;letter-spacing:1px;"
        f'          padding:14px 28px;border-radius:2px;">'
        f"{label}"
        f"</a>"
        f"</td></tr></table>"
    )


def _h(text: str) -> str:
    return (
        f'<h2 style="margin:0 0 20px;font-size:22px;font-weight:400;'
        f'color:{_TEXT_HI};line-height:1.3;">{text}</h2>'
    )


def _p(text: str, muted: bool = False) -> str:
    color = _TEXT_MID if muted else _TEXT_HI
    return (
        f'<p style="margin:0 0 14px;font-family:Arial,sans-serif;'
        f'font-size:14px;line-height:1.7;color:{color};">{text}</p>'
    )


def _rule() -> str:
    return f'<div style="border-top:1px solid {_BORDER};margin:28px 0;"></div>'


def build_invite_html(registration_url: str, contact_name: str | None = None) -> str:
    """HTML invite email sent to companies when admin creates an invite."""
    greeting = f"שלום {contact_name}," if contact_name else "שלום,"
    body = (
        _h("הזמנה להצטרפות לפלטפורמה")
        + _p(greeting)
        + _p("הוזמנת להירשם לפלטפורמת RS Recruiting ולהתחיל לפרסם משרות ולקבל מועמדים.")
        + _cta(registration_url, "השלמת תהליך ההרשמה")
        + _rule()
        + _p("הקישור תקף ל-48 שעות בלבד.", muted=True)
    )
    return _wrap("הזמנה להרשמה — RS Recruiting", body)


def build_approval_html(company_name: str, activation_url: str) -> str:
    """HTML approval email sent after admin approves a company registration."""
    body = (
        _h("הבקשה שלכם אושרה")
        + _p(f"בקשת ההרשמה של <strong>{company_name}</strong> התקבלה.")
        + _p(
            "מצורף לאימייל זה החוזה החתום. "
            "לחצו על הכפתור להפעלת החשבון ותחילת השימוש בפלטפורמה."
        )
        + _cta(activation_url, "הפעלת החשבון")
        + _rule()
        + _p("לאחר הלחיצה תוכלו להתחבר ולהתחיל לפרסם משרות.", muted=True)
    )
    return _wrap("הבקשה שלכם אושרה — RS Recruiting", body)
