#!/usr/bin/env python3
"""הרצת נתוני בדיקה לפיתוח מקומי.

שימוש:
    PYTHONPATH=. uv run python scripts/seed_mock_data.py

הרץ לאחר הפעלת הבקאנד (docker compose up) והוספת משתמש מנהל.

יוצר:
    - 1 משתמש מנהל (admin@rsrecruit.co.il / Admin123!)
    - 3 חברות עם פרופילים
    - 15 משרות (5 לכל חברה, סטטוסים מעורבים)
    - 8 פרופילי מועמדים
    - כ-12 מועמדויות (סטטוסים שונים)
"""

import asyncio

from sqlalchemy import select

from src.core.infrastructure.database import async_session, init_db
from src.core.infrastructure.security import get_password_hash
from src.enums import ApplicationStatus, JobStatus, UserRole
from src.models import Application, CandidateProfile, CompanyProfile, Job, User

# ── מנהל ──
ADMIN_EMAIL = "admin@rsrecruit.co.il"
ADMIN_PASSWORD = "Admin123!"

# ── חברות ──
COMPANIES = [
    {
        "email": "ops@integrated-fm.co.il",
        "password": "Company123!",
        "company_name": 'פתרונות מתקנים בע"מ',
        "contact_person": "דוד כהן",
        "contact_phone": "050-1111111",
    },
    {
        "email": "hr@sharion.co.il",
        "password": "Company123!",
        "company_name": "שריון — אבטחה ותחזוקה",
        "contact_person": "נועה לוי",
        "contact_phone": "050-2222222",
    },
    {
        "email": "info@cleanpro.co.il",
        "password": "Company123!",
        "company_name": "קלינפרו שירותי מתקנים",
        "contact_person": "רן מזרחי",
        "contact_phone": "050-3333333",
    },
]

# ── משרות ──
JOBS_BY_COMPANY = [
    # פתרונות מתקנים
    [
        {
            "title": "מנהל מתקנים בכיר",
            "description": "ניהול קמפוס מסחרי — מיזוג, חשמל, אינסטלציה וניקיון.",
            "requirements": "5+ שנות ניסיון בניהול מתקנים. תואר הנדסה.",
            "location": "תל אביב",
            "status": JobStatus.PUBLISHED,
        },
        {
            "title": "טכנאי מיזוג אוויר",
            "description": "התקנה ותחזוקת מערכות מיזוג אצל לקוחות מגוונים.",
            "requirements": "3+ שנות ניסיון. תעודת מיזוג. רישיון נהיגה.",
            "location": "תל אביב",
            "status": JobStatus.PUBLISHED,
        },
        {
            "title": "מהנדס מערכות בניין",
            "description": "ניהול מערכות BMS ואופטימיזציית צריכת אנרגיה.",
            "requirements": "תואר הנדסה מכנית/חשמלית. 3+ שנות ניסיון ב-BMS.",
            "location": "הרצליה",
            "status": JobStatus.PUBLISHED,
        },
        {
            "title": "מנהל תחזוקה חשמלית",
            "description": "פיקוח על צוות חשמלאים ב-5 נכסי לקוח.",
            "requirements": "הנדסאי חשמל. 5+ שנות ניסיון. רישיון משרד האנרגיה.",
            "location": "תל אביב",
            "status": JobStatus.PENDING_APPROVAL,
        },
        {
            "title": "ראש צוות אינסטלציה",
            "description": "ניהול תחזוקת אינסטלציה בקמפוס בית חולים.",
            "requirements": "10+ שנות ניסיון. 3+ שנות ניהול. תעודת מים.",
            "location": "רמת גן",
            "status": JobStatus.CLOSED,
        },
    ],
    # שריון — אבטחה ותחזוקה
    [
        {
            "title": "מנהל מבצעי ביטחון",
            "description": "ניהול אבטחת 8 מבנים מסחריים ו-40 מאבטחים.",
            "requirements": "5+ שנות ניסיון. רישיון מנהל ביטחון ממשרד הפנים.",
            "location": "תל אביב",
            "status": JobStatus.PUBLISHED,
        },
        {
            "title": "רכז בטיחות אש",
            "description": "הטמעת תוכניות בטיחות אש ופיקוח על ציוד כיבוי.",
            "requirements": "תעודת בטיחות אש. 3+ שנות ניסיון. הדרכת עזרה ראשונה.",
            "location": "חיפה",
            "status": JobStatus.PUBLISHED,
        },
        {
            "title": "טכנאי בקרת כניסה",
            "description": "התקנת מערכות RFID, ביומטריה ואינטרקום.",
            "requirements": "2+ שנות ניסיון בבקרת כניסה. רקע אלקטרוניקה.",
            "location": "פתח תקווה",
            "status": JobStatus.PUBLISHED,
        },
        {
            "title": "מאבטח — קמפוס היי-טק",
            "description": "סיורים, ניטור CCTV וקבלת אורחים בקמפוס טכנולוגי.",
            "requirements": "רישיון מאבטח בתוקף. עברית ואנגלית בסיסית.",
            "location": "הרצליה",
            "status": JobStatus.PENDING_APPROVAL,
        },
        {
            "title": "מנהל מערכות CCTV",
            "description": "ניהול Milestone XProtect, בריאות מצלמות ואחסון.",
            "requirements": "הסמכת Milestone. 3+ שנות ניסיון. זמינות כוננות.",
            "location": "תל אביב",
            "status": JobStatus.CLOSED,
        },
    ],
    # קלינפרו שירותי מתקנים
    [
        {
            "title": "מנהל פעילות ניקיון",
            "description": "ניהול ניקיון ב-12 נכסים וצוות של 80+ עובדים.",
            "requirements": "5+ שנות ניסיון בניהול ניקיון. שליטה בעברית ובערבית.",
            "location": "ירושלים",
            "status": JobStatus.PUBLISHED,
        },
        {
            "title": "מומחה ניקיון תעשייתי",
            "description": "ניקיון מפעלי מזון ומחסנים. תפעול ציוד תעשייתי.",
            "requirements": "2+ שנות ניסיון. הסמכת חומרים מסוכנים.",
            "location": "אשדוד",
            "status": JobStatus.PUBLISHED,
        },
        {
            "title": "מנהל פסולת ומיחזור",
            "description": "פיקוח על מיחזור ופינוי פסולת עבור לקוחות עסקיים.",
            "requirements": "3+ שנות ניסיון. ידע ברגולציית משרד הסביבה.",
            "location": "ראשון לציון",
            "status": JobStatus.PUBLISHED,
        },
        {
            "title": "מפקח איכות ניקיון",
            "description": "ביקורות איכות בלתי מוכרזות בכל אתרי הלקוחות.",
            "requirements": "2+ שנות ניסיון. עין חדה לפרטים. רכב פרטי.",
            "location": "תל אביב",
            "status": JobStatus.PENDING_APPROVAL,
        },
        {
            "title": "ראש צוות ניקיון",
            "description": "ניהול 6 עובדים בקומפלקס משרדי ממשלתי.",
            "requirements": "ניסיון ניהולי. אוריינות מחשב. אישור ביטחון.",
            "location": "ירושלים",
            "status": JobStatus.CLOSED,
        },
    ],
]

# ── מועמדים ──
CANDIDATES = [
    {
        "full_name": "אחמד פאהום",
        "email": "ahmed.fahoum@gmail.com",
        "phone": "054-1234567",
        "linkedin_url": "https://linkedin.com/in/ahmed-fahoum",
        "service_concept": "שרת כקצין ביטחון בפיקוד העורף. ניהול תרגילים.",
        "salary_expectations": "18,000–22,000 ₪ לחודש",
        "military_service_details": "פיקוד העורף, סמל, 2014–2017",
        "transportation": 'רכב פרטי. מוכן עד 30 ק"מ.',
        "personality_strength": "רגוע תחת לחץ ומאוד שיטתי",
        "personality_weakness": "לפעמים מרבה לעסוק בפרטים הקטנים",
    },
    {
        "full_name": "מאיה בן-דוד",
        "email": "maya.bd@gmail.com",
        "phone": "052-2345678",
        "linkedin_url": "https://linkedin.com/in/maya-ben-david",
        "service_concept": "קצינת מתקנים בחיל האוויר. ניהול לוחות תחזוקה.",
        "salary_expectations": "23,000–28,000 ₪ לחודש",
        "military_service_details": "חיל האוויר, קצינת מתקנים, 2016–2019",
        "transportation": "רכב פרטי, רישיון נהיגה בתוקף",
        "personality_strength": "מנהיגות חזקה ותיאום צוות",
        "personality_weakness": "נוטה לקחת על עצמה יותר מדי משימות",
    },
    {
        "full_name": "יוסי ממן",
        "email": "yossi.maman@gmail.com",
        "phone": "053-3456789",
        "linkedin_url": None,
        "service_concept": "חובש קרבי בחטיבת גבעתי. ניהול מלאי ותחזוקת בסיס.",
        "salary_expectations": "12,000–15,000 ₪ לחודש",
        "military_service_details": "חטיבת גבעתי, חובש קרבי, 2018–2021",
        "transportation": "תחבורה ציבורית. גר ליד תחנת רכבת.",
        "personality_strength": "אמין, חרוץ, מצוין עם אנשים",
        "personality_weakness": "אנגלית מוגבלת",
    },
    {
        "full_name": "רינת שפירא",
        "email": "rinat.shapira@gmail.com",
        "phone": "050-4567890",
        "linkedin_url": "https://linkedin.com/in/rinat-shapira",
        "service_concept": "קצינת לוגיסטיקה במשרד הביטחון. ניהול שרשרת אספקה.",
        "salary_expectations": "16,000–20,000 ₪ לחודש",
        "military_service_details": "משרד הביטחון, סמלת לוגיסטיקה, 2015–2020",
        "transportation": "רכב פרטי",
        "personality_strength": "ארגון ותכנון מעולים",
        "personality_weakness": "לעיתים מתקשה להאציל משימות",
    },
    {
        "full_name": "שלמה אברהם",
        "email": "shlomo.avraham@gmail.com",
        "phone": "055-5678901",
        "linkedin_url": "https://linkedin.com/in/shlomo-avraham",
        "service_concept": "חשמלאי בחיל הים. תחזוקת מערכות חשמל ומחוללים.",
        "salary_expectations": "14,000–18,000 ₪ לחודש",
        "military_service_details": "חיל הים, טכנאי חשמל, 2017–2020",
        "transportation": "אופנוע. מוכן לעבור דירה.",
        "personality_strength": "פותר בעיות מעשי, לומד מהר",
        "personality_weakness": "מעדיף עבודה עצמאית על פני צוות גדול",
    },
    {
        "full_name": "ליאת אוחנה",
        "email": "liat.ohana@gmail.com",
        "phone": "052-6789012",
        "linkedin_url": None,
        "service_concept": "סמלת מינהלה בפיקוד הדרום. ניהול לוח זמנים ואורחים.",
        "salary_expectations": "10,000–13,000 ₪ לחודש",
        "military_service_details": "פיקוד הדרום, סמלת מינהלה, 2019–2021",
        "transportation": "תחבורה ציבורית בלבד",
        "personality_strength": "ידידותית, מאורגנת, נוכחות טלפונית מצוינת",
        "personality_weakness": "אין רקע טכני",
    },
    {
        "full_name": "עמיר גולן",
        "email": "amir.golan@gmail.com",
        "phone": "054-7890123",
        "linkedin_url": "https://linkedin.com/in/amir-golan",
        "service_concept": "קצין הנדסה בחיל ההנדסה. ניהול פרויקטי תשתית.",
        "salary_expectations": "25,000–32,000 ₪ לחודש",
        "military_service_details": "חיל ההנדסה, קצין תשתיות, 2013–2018",
        "transportation": "רכב פרטי. רישיון נהיגה מלא.",
        "personality_strength": "חשיבה אסטרטגית וידע טכני רחב",
        "personality_weakness": "חסר סבלנות לתהליכים איטיים",
    },
    {
        "full_name": "סאמי ג'בארין",
        "email": "sami.jabarin@gmail.com",
        "phone": "050-8901234",
        "linkedin_url": None,
        "service_concept": "עבד 8 שנים במשפחה בענף הבנייה: אינסטלציה ואריחים.",
        "salary_expectations": "11,000–14,000 ₪ לחודש",
        "military_service_details": "לא שירת (פטור)",
        "transportation": "רכב פרטי",
        "personality_strength": "עובד קשה ואמין ביותר",
        "personality_weakness": "השכלה פורמלית מוגבלת (כיתה י')",
    },
]


def _print_result(entity: str, action: str, detail: str = "") -> None:
    icon = "✅" if action == "created" else "⏭️"
    print(f"  {icon} {entity}: {detail}")


async def seed() -> None:
    """פונקציית הזרעה הראשית."""
    print("🌱 מזריע נתוני בדיקה עבור RS Recruiting\n")

    await init_db()

    async with async_session() as session:
        # ── מנהל ──
        result = await session.execute(select(User).where(User.email == ADMIN_EMAIL))
        admin = result.scalar_one_or_none()
        if admin:
            _print_result("מנהל", "skipped", ADMIN_EMAIL)
            admin_user = admin
        else:
            admin_user = User(
                email=ADMIN_EMAIL,
                hashed_password=get_password_hash(ADMIN_PASSWORD),
                role=UserRole.ADMIN,
                is_active=True,
            )
            session.add(admin_user)
            await session.flush()
            _print_result("מנהל", "created", f"{ADMIN_EMAIL} / {ADMIN_PASSWORD}")

        # ── חברות + משתמשים ──
        company_users: list[User] = []
        company_profiles: list[CompanyProfile] = []
        for c in COMPANIES:
            result = await session.execute(select(User).where(User.email == c["email"]))
            user = result.scalar_one_or_none()
            if user:
                _print_result("משתמש חברה", "skipped", c["email"])
            else:
                user = User(
                    email=c["email"],
                    hashed_password=get_password_hash(c["password"]),
                    role=UserRole.COMPANY,
                    is_active=True,
                )
                session.add(user)
                await session.flush()
                _print_result(
                    "משתמש חברה", "created", f"{c['email']} / {c['password']}"
                )

            result = await session.execute(
                select(CompanyProfile).where(CompanyProfile.user_id == user.id)
            )
            profile = result.scalar_one_or_none()
            if profile:
                _print_result("פרופיל חברה", "skipped", c["company_name"])
            else:
                profile = CompanyProfile(
                    user_id=user.id,
                    name=c["company_name"],
                    contact_person=c["contact_person"],
                    contact_phone=c["contact_phone"],
                )
                session.add(profile)
                await session.flush()
                _print_result("פרופיל חברה", "created", c["company_name"])

            company_users.append(user)
            company_profiles.append(profile)

        # ── משרות ──
        all_jobs: list[Job] = []
        for idx, jobs in enumerate(JOBS_BY_COMPANY):
            profile = company_profiles[idx]
            for j in jobs:
                result = await session.execute(
                    select(Job).where(
                        Job.company_id == profile.id,
                        Job.title == j["title"],
                    )
                )
                job = result.scalar_one_or_none()
                if job:
                    _print_result("משרה", "skipped", f"{j['title']} ({profile.name})")
                else:
                    job = Job(
                        company_id=profile.id,
                        title=j["title"],
                        description=j["description"],
                        requirements=j["requirements"],
                        location=j["location"],
                        status=j["status"],
                    )
                    session.add(job)
                    await session.flush()
                    _print_result(
                        "משרה", "created", f"{j['title']} ({j['status'].value})"
                    )
                all_jobs.append(job)

        # ── מועמדים ──
        created_candidates: list[CandidateProfile] = []
        for cand in CANDIDATES:
            result = await session.execute(
                select(CandidateProfile).where(CandidateProfile.email == cand["email"])
            )
            existing = result.scalar_one_or_none()
            if existing:
                _print_result("מועמד", "skipped", cand["full_name"])
                created_candidates.append(existing)
            else:
                profile = CandidateProfile(
                    full_name=cand["full_name"],
                    email=cand["email"],
                    phone=cand["phone"],
                    linkedin_url=cand["linkedin_url"],
                    service_concept=cand["service_concept"],
                    salary_expectations=cand["salary_expectations"],
                    military_service_details=cand["military_service_details"],
                    transportation=cand["transportation"],
                    personality_strength=cand["personality_strength"],
                    personality_weakness=cand["personality_weakness"],
                )
                session.add(profile)
                await session.flush()
                _print_result("מועמד", "created", cand["full_name"])
                created_candidates.append(profile)

        # ── מועמדויות ──
        published_jobs = [j for j in all_jobs if j.status == JobStatus.PUBLISHED]
        statuses = [
            ApplicationStatus.NEW,
            ApplicationStatus.APPROVED_BY_ADMIN,
            ApplicationStatus.REJECTED,
            ApplicationStatus.HIRED,
        ]

        for i, candidate in enumerate(created_candidates):
            for offset in range(2):
                job_idx = (i + offset) % len(published_jobs)
                job = published_jobs[job_idx]

                result = await session.execute(
                    select(Application).where(
                        Application.job_id == job.id,
                        Application.candidate_id == candidate.id,
                    )
                )
                if result.scalar_one_or_none():
                    _print_result(
                        "מועמדות",
                        "skipped",
                        f"{candidate.full_name} → {job.title}",
                    )
                    continue

                app_status = statuses[(i + offset) % len(statuses)]
                admin_notes = None
                if app_status == ApplicationStatus.APPROVED_BY_ADMIN:
                    admin_notes = "מועמד מתאים, עם ניסיון רלוונטי. מאושר לראיון."
                elif app_status == ApplicationStatus.REJECTED:
                    admin_notes = "הניסיון אינו עומד בדרישות המינימום לתפקיד."
                elif app_status == ApplicationStatus.HIRED:
                    admin_notes = "התאמה מעולה. המועמד קיבל את ההצעה ואישר תחילת עבודה."

                app = Application(
                    job_id=job.id,
                    candidate_id=candidate.id,
                    status=app_status,
                    admin_notes=admin_notes,
                )
                session.add(app)
                await session.flush()
                _print_result(
                    "מועמדות",
                    "created",
                    f"{candidate.full_name} → {job.title} [{app_status.value}]",
                )

        await session.commit()

    print(f"\n{'─' * 50}")
    print(f"  {'סה"כ':<30} {'נוצר':>8} {'דולג':>8}")
    print(f"  {'─' * 46}")
    print(f"  {'מנהלים':<30} {'1':>8}")
    print(f"  {'חברות':<30} {'3':>8}")
    print(f"  {'משרות':<30} {'15':>8}")
    print(f"  {'מועמדים':<30} {'8':>8}")
    print(f"  {'מועמדויות':<30} {'~12–15':>8}")
    print(f"{'─' * 50}")
    print(f"\n🔑 כניסת מנהל:  {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
    print("🔑 כניסת חברה:  (כל חברה עם האימייל שלה / Company123!)")


def main() -> None:
    """נקודת כניסה."""
    asyncio.run(seed())


if __name__ == "__main__":
    main()
