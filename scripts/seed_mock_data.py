#!/usr/bin/env python3
"""Seed mock data for local development and testing.

Usage:
    PYTHONPATH=. uv run python scripts/seed_mock_data.py

Run this after starting the backend (docker compose up) and seeding the admin user.

Generates:
    - 1 admin user (admin@fmrecruit.com / Admin123!)
    - 3 company users with CompanyProfiles
    - 15 jobs (5 per company, mixed statuses)
    - 8 candidate profiles
    - 12 applications (various statuses)
"""

import asyncio

from sqlalchemy import select

from src.core.infrastructure.database import async_session, init_db
from src.core.infrastructure.security import get_password_hash
from src.enums import ApplicationStatus, JobStatus, UserRole
from src.models import Application, CandidateProfile, CompanyProfile, Job, User

# ── Admin ──
ADMIN_EMAIL = "admin@fmrecruit.com"
ADMIN_PASSWORD = "Admin123!"

# ── Companies ──
COMPANIES = [
    {
        "email": "ops@integrated-fm.com",
        "password": "Company123!",
        "company_name": "Integrated Facility Solutions",
        "contact_person": "David Cohen",
        "contact_phone": "050-1111111",
    },
    {
        "email": "hr@premiseguard.co.il",
        "password": "Company123!",
        "company_name": "PremiseGuard Security & Maintenance",
        "contact_person": "Noa Levy",
        "contact_phone": "050-2222222",
    },
    {
        "email": "info@cleanpro.co.il",
        "password": "Company123!",
        "company_name": "CleanPro Facility Services",
        "contact_person": "Ran Mizrahi",
        "contact_phone": "050-3333333",
    },
]

# ── Jobs ──
JOBS_BY_COMPANY = [
    # Integrated Facility Solutions
    [
        {
            "title": "Senior Facility Manager",
            "description": "Oversee daily operations of a 50,000 sqm commercial campus incl. HVAC, plumbing, electrical, and janitorial. Lead a team of 12 technicians and coordinate with external vendors.",
            "requirements": "5+ years facility management experience. BSc in Industrial Engineering or equivalent. PMP certification preferred. Excellent Hebrew and English.",
            "location": "Tel Aviv",
            "status": JobStatus.PUBLISHED,
        },
        {
            "title": "HVAC Technician",
            "description": "Install, maintain, and repair HVAC systems across multiple client sites. Perform preventive maintenance and emergency repairs.",
            "requirements": "3+ years HVAC experience. Technical certification required. Type 1-3 refrigerant handling license. Valid driver's license.",
            "location": "Tel Aviv",
            "status": JobStatus.PUBLISHED,
        },
        {
            "title": "Building Systems Engineer",
            "description": "Manage BMS (Building Management System) for smart office buildings. Monitor energy consumption, optimize HVAC schedules, and implement IoT sensor upgrades.",
            "requirements": "BSc in Mechanical/Electrical Engineering. 3+ years with BMS platforms (Siemens, Honeywell, or Johnson Controls). Energy efficiency certification a plus.",
            "location": "Herzliya",
            "status": JobStatus.PUBLISHED,
        },
        {
            "title": "Electrical Maintenance Supervisor",
            "description": "Supervise electrical maintenance team across 5 client properties. Plan preventive maintenance schedules and ensure compliance with Israeli electrical standards.",
            "requirements": "Practical engineer (Handesai) in Electrical Engineering. 5+ years supervisory experience. Licensed by the Ministry of Energy. Knowledge of Israeli standard SI 61439.",
            "location": "Tel Aviv",
            "status": JobStatus.PENDING_APPROVAL,
        },
        {
            "title": "Plumbing Maintenance Lead",
            "description": "Lead plumbing maintenance for a large hospital campus. Coordinate emergency repairs, manage parts inventory, and train junior plumbers.",
            "requirements": "10+ years plumbing experience. 3+ years in a lead/supervisory role. Experience with medical gas systems preferred. Water certificate from Ministry of Health.",
            "location": "Ramat Gan",
            "status": JobStatus.CLOSED,
        },
    ],
    # PremiseGuard
    [
        {
            "title": "Security Operations Manager",
            "description": "Manage security operations for a portfolio of 8 commercial buildings. Oversee 40 security guards, CCTV systems, access control, and emergency response procedures.",
            "requirements": "5+ years security management experience. Retired police/military officer preferred. Certified security manager license from Ministry of Public Security.",
            "location": "Tel Aviv",
            "status": JobStatus.PUBLISHED,
        },
        {
            "title": "Fire Safety Coordinator",
            "description": "Develop and implement fire safety programs across client facilities. Conduct fire drills, inspect extinguishers and sprinklers, and maintain compliance with Fire Department regulations.",
            "requirements": "Fire safety certification from Israel Fire and Rescue Services. 3+ years experience in fire safety coordination. First responder training preferred.",
            "location": "Haifa",
            "status": JobStatus.PUBLISHED,
        },
        {
            "title": "Access Control Technician",
            "description": "Install and maintain electronic access control systems (DDS, Lenel, or similar). Program RFID readers, biometric scanners, and intercom systems.",
            "requirements": "2+ years experience with access control systems. Technical background in electronics or low-voltage systems. Customer service oriented.",
            "location": "Petah Tikva",
            "status": JobStatus.PUBLISHED,
        },
        {
            "title": "Security Guard - Hi-Tech Campus",
            "description": "Entry-level security guard for a hi-tech campus in Herzliya. Patrol grounds, monitor CCTV, screen visitors, and respond to incidents.",
            "requirements": "Valid security guard license from Ministry of Public Security. No criminal record. Basic Hebrew and English. Must pass physical fitness test.",
            "location": "Herzliya",
            "status": JobStatus.PENDING_APPROVAL,
        },
        {
            "title": "CCTV System Administrator",
            "description": "Administer Milestone XProtect VMS across multiple sites. Maintain camera health, storage retention, and user permissions. Generate incident reports.",
            "requirements": "Milestone certifications preferred. 3+ years experience with VMS platforms. Networking fundamentals (TCP/IP, VLANs). Available for on-call rotation.",
            "location": "Tel Aviv",
            "status": JobStatus.CLOSED,
        },
    ],
    # CleanPro
    [
        {
            "title": "Cleaning Operations Manager",
            "description": "Manage janitorial operations for 12 commercial properties. Schedule 80+ cleaning staff, manage supply inventory, and maintain quality standards through regular inspections.",
            "requirements": "5+ years in cleaning/housekeeping management. Strong logistical and people management skills. Familiarity with green cleaning standards. Fluent Arabic and Hebrew.",
            "location": "Jerusalem",
            "status": JobStatus.PUBLISHED,
        },
        {
            "title": "Industrial Cleaning Specialist",
            "description": "Perform specialized industrial cleaning at food processing plants and warehouses. Operate floor scrubbers, pressure washers, and chemical dispensing equipment.",
            "requirements": "2+ years industrial cleaning experience. Certification in hazardous material handling (OSHA equivalent). Knowledge of kosher cleaning protocols for food facilities.",
            "location": "Ashdod",
            "status": JobStatus.PUBLISHED,
        },
        {
            "title": "Waste Management Supervisor",
            "description": "Supervise waste disposal and recycling programs for municipal and commercial clients. Ensure compliance with Ministry of Environmental Protection regulations.",
            "requirements": "3+ years in waste management. Knowledge of Israeli recycling regulations (package law, electronic waste). Supervisory experience. Truck license preferred.",
            "location": "Rishon LeZion",
            "status": JobStatus.PUBLISHED,
        },
        {
            "title": "Cleaning Quality Inspector",
            "description": "Conduct unannounced quality inspections across client sites. Score cleaning quality, identify deficiencies, and work with site managers on corrective action plans.",
            "requirements": "2+ years in quality assurance. High attention to detail. Strong documentation skills. Willingness to travel between sites (car required).",
            "location": "Tel Aviv",
            "status": JobStatus.PENDING_APPROVAL,
        },
        {
            "title": "Janitorial Team Lead",
            "description": "Lead a team of 6 janitors at a large government office complex. Assign daily tasks, train new staff, and ensure all KPIs are met.",
            "requirements": "1+ year supervisory experience in cleaning services. Good communication skills. Basic computer literacy for reporting. Must pass government security clearance.",
            "location": "Jerusalem",
            "status": JobStatus.CLOSED,
        },
    ],
]

# ── Candidates ──
CANDIDATES = [
    {
        "full_name": "Ahmed Fahoum",
        "email": "ahmed.fahoum@gmail.com",
        "phone": "054-1234567",
        "linkedin_url": "https://linkedin.com/in/ahmed-fahoum",
        "service_concept": "Served as base security NCO in the Home Front Command. Managed emergency drills and unit readiness.",
        "salary_expectations": "18,000 - 22,000 NIS per month",
        "military_service_details": "Home Front Command, Sergeant (Mashak Tash), 2014-2017",
        "transportation": "Private car. Willing to travel up to 30 km.",
        "personality_strength": "Calm under pressure and very methodical",
        "personality_weakness": "Sometimes too detail-oriented, can slow down decision-making",
    },
    {
        "full_name": "Maya Ben-David",
        "email": "maya.bd@gmail.com",
        "phone": "052-2345678",
        "linkedin_url": "https://linkedin.com/in/maya-ben-david",
        "service_concept": "Served as facility management officer at the Air Force. Managed maintenance schedules for hangars and support buildings.",
        "salary_expectations": "23,000 - 28,000 NIS per month",
        "military_service_details": "Israeli Air Force, Facilities Management Officer (Katzin Tafkidanut), 2016-2019",
        "transportation": "Private car, valid driver's license",
        "personality_strength": "Strong leadership and team coordination",
        "personality_weakness": "Tends to take on too many tasks at once",
    },
    {
        "full_name": "Yossi Maman",
        "email": "yossi.maman@gmail.com",
        "phone": "053-3456789",
        "linkedin_url": None,
        "service_concept": "Served as combat medic in the Givati Brigade. Responsible for equipment inventory and base maintenance during reserve duty.",
        "salary_expectations": "12,000 - 15,000 NIS per month",
        "military_service_details": "Givati Brigade, Combat Medic (Chovel), 2018-2021",
        "transportation": "Public transportation. Lives near train station.",
        "personality_strength": "Reliable, hardworking, great with people",
        "personality_weakness": "Limited English proficiency",
    },
    {
        "full_name": "Rinat Shapira",
        "email": "rinat.shapira@gmail.com",
        "phone": "050-4567890",
        "linkedin_url": "https://linkedin.com/in/rinat-shapira",
        "service_concept": "Served in logistics at the Ministry of Defense. Managed supply chains and warehouse operations for a large military base.",
        "salary_expectations": "16,000 - 20,000 NIS per month",
        "military_service_details": "Ministry of Defense, Logistics NCO (Samal Logisti), 2015-2020",
        "transportation": "Private car",
        "personality_strength": "Excellent organizational and planning skills",
        "personality_weakness": "Can be hesitant to delegate tasks",
    },
    {
        "full_name": "Shlomo Avraham",
        "email": "shlomo.avraham@gmail.com",
        "phone": "055-5678901",
        "linkedin_url": "https://linkedin.com/in/shlomo-avraham",
        "service_concept": "Served as electrician in the Navy. Maintained onboard electrical systems and generators.",
        "salary_expectations": "14,000 - 18,000 NIS per month",
        "military_service_details": "Israeli Navy, Electrical Technician (Technai Chashmal), 2017-2020",
        "transportation": "Motorcycle. Willing to relocate.",
        "personality_strength": "Hands-on problem solver, quick learner",
        "personality_weakness": "Prefer working alone rather than in large teams",
    },
    {
        "full_name": "Liat Ohana",
        "email": "liat.ohana@gmail.com",
        "phone": "052-6789012",
        "linkedin_url": None,
        "service_concept": "Served as administrative NCO at the Southern Command. Managed office operations, scheduling, and visitor coordination.",
        "salary_expectations": "10,000 - 13,000 NIS per month",
        "military_service_details": "Southern Command, Administrative NCO (Samlad Mintali), 2019-2021",
        "transportation": "Public transportation only",
        "personality_strength": "Friendly, organized, great phone presence",
        "personality_weakness": "No technical background",
    },
    {
        "full_name": "Amir Golan",
        "email": "amir.golan@gmail.com",
        "phone": "054-7890123",
        "linkedin_url": "https://linkedin.com/in/amir-golan",
        "service_concept": "Served as engineering officer in the Engineering Corps. Specialized in infrastructure maintenance and construction project management.",
        "salary_expectations": "25,000 - 32,000 NIS per month",
        "military_service_details": "Engineering Corps, Infrastructure Officer (Katzin Tatnua), 2013-2018",
        "transportation": "Private car. Full driving license.",
        "personality_strength": "Strategic thinker with strong technical knowledge",
        "personality_weakness": "Can be impatient with slow processes",
    },
    {
        "full_name": "Sami Jabarin",
        "email": "sami.jabarin@gmail.com",
        "phone": "050-8901234",
        "linkedin_url": None,
        "service_concept": "No military service. Worked in family construction business for 8 years doing plumbing, tiling, and general maintenance.",
        "salary_expectations": "11,000 - 14,000 NIS per month",
        "military_service_details": "Not served (exemption)",
        "transportation": "Private car",
        "personality_strength": "Extremely hardworking and reliable",
        "personality_weakness": "Limited formal education (10th grade)",
    },
]


def _print_result(entity: str, action: str, detail: str = "") -> None:
    icon = "✅" if action == "created" else "⏭️"
    print(f"  {icon} {entity}: {detail}")


async def seed() -> None:
    """Main seed function."""
    print("🌱 Seeding mock data for RS Recruitment\n")

    await init_db()

    async with async_session() as session:
        # ── Admin ──
        result = await session.execute(
            select(User).where(User.email == ADMIN_EMAIL)
        )
        admin = result.scalar_one_or_none()
        if admin:
            _print_result("Admin", "skipped", ADMIN_EMAIL)
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
            _print_result("Admin", "created", f"{ADMIN_EMAIL} / {ADMIN_PASSWORD}")

        # ── Companies + Users ──
        company_users: list[User] = []
        company_profiles: list[CompanyProfile] = []
        for c in COMPANIES:
            result = await session.execute(
                select(User).where(User.email == c["email"])
            )
            user = result.scalar_one_or_none()
            if user:
                _print_result("Company user", "skipped", c["email"])
            else:
                user = User(
                    email=c["email"],
                    hashed_password=get_password_hash(c["password"]),
                    role=UserRole.COMPANY,
                    is_active=True,
                )
                session.add(user)
                await session.flush()
                _print_result("Company user", "created", f"{c['email']} / {c['password']}")

            result = await session.execute(
                select(CompanyProfile).where(CompanyProfile.user_id == user.id)
            )
            profile = result.scalar_one_or_none()
            if profile:
                _print_result("Company profile", "skipped", c["company_name"])
            else:
                profile = CompanyProfile(
                    user_id=user.id,
                    name=c["company_name"],
                    contact_person=c["contact_person"],
                    contact_phone=c["contact_phone"],
                )
                session.add(profile)
                await session.flush()
                _print_result("Company profile", "created", c["company_name"])

            company_users.append(user)
            company_profiles.append(profile)

        # ── Jobs ──
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
                    _print_result("Job", "skipped", f"{j['title']} ({profile.name})")
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
                    _print_result("Job", "created", f"{j['title']} ({j['status'].value})")
                all_jobs.append(job)

        # ── Candidates ──
        created_candidates: list[CandidateProfile] = []
        for cand in CANDIDATES:
            result = await session.execute(
                select(CandidateProfile).where(
                    CandidateProfile.email == cand["email"]
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                _print_result("Candidate", "skipped", cand["full_name"])
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
                _print_result("Candidate", "created", cand["full_name"])
                created_candidates.append(profile)

        # ── Applications ──
        # Pick PUBLISHED jobs and distribute candidates
        published_jobs = [j for j in all_jobs if j.status == JobStatus.PUBLISHED]
        statuses = [
            ApplicationStatus.NEW,
            ApplicationStatus.APPROVED_BY_ADMIN,
            ApplicationStatus.REJECTED,
            ApplicationStatus.HIRED,
        ]

        for i, candidate in enumerate(created_candidates):
            # Each candidate applies to 1-2 published jobs
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
                        "Application", "skipped",
                        f"{candidate.full_name} → {job.title}",
                    )
                    continue

                # Distribute statuses
                app_status = statuses[(i + offset) % len(statuses)]
                admin_notes = None
                if app_status == ApplicationStatus.APPROVED_BY_ADMIN:
                    admin_notes = "Strong candidate, good experience in facilities management. Approved for interview."
                elif app_status == ApplicationStatus.REJECTED:
                    admin_notes = "Experience does not meet minimum requirements for this role."
                elif app_status == ApplicationStatus.HIRED:
                    admin_notes = "Excellent fit. Candidate accepted offer, start date confirmed."

                app = Application(
                    job_id=job.id,
                    candidate_id=candidate.id,
                    status=app_status,
                    admin_notes=admin_notes,
                )
                session.add(app)
                await session.flush()
                _print_result(
                    "Application", "created",
                    f"{candidate.full_name} → {job.title} [{app_status.value}]",
                )

        await session.commit()

    print(f"\n{'─' * 50}")
    print(f"  {'Total':<30} {'Created':>8} {'Skipped':>8}")
    print(f"  {'─' * 46}")
    print(f"  {'Admins':<30} {'1':>8} >")
    print(f"  {'Companies':<30} {'3':>8} >")
    print(f"  {'Jobs':<30} {'15':>8} >")
    print(f"  {'Candidates':<30} {'8':>8} >")
    print(f"  {'Applications':<30} {'~12-15':>8} >")
    print(f"{'─' * 50}")
    print(f"\n🔑 Admin login:     {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
    print("🔑 Company logins:  admin@fmrecruit.com / Company123!")
    print("                    (each company uses their own email)")
    print("\n💡 Tip: Run with PYTHONPATH=. uv run python scripts/seed_mock_data.py")


def main() -> None:
    """Entry point."""
    asyncio.run(seed())


if __name__ == "__main__":
    main()
