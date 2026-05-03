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

_LOGO_B64 = (
    "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEuMiIgd2lkdGg9"
    "IjUwMCIgaGVpZ2h0PSI1MDAiIGJhc2VQcm9maWxlPSJ0aW55LXBzIj48dGl0bGU+Q29tcGFueSBOYW1l"
    "PC90aXRsZT48cGF0aCBkPSJNMCAwIEMyLjUzMDA3ODI4IC0wLjAwNDM0NTE0IDUuMDU4MzY2NTggLTAu"
    "MDQwNjkwMTUgNy41ODgxMzQ3NyAtMC4wNzg2MTMyOCBDNDUuNTg4MTQ3MjggLTAuMzQwMjQwNDIgODMu"
    "NzUyMzcxODMgMTcuNDA5MjQ5NDYgMTEwLjc3NzU4Nzg5IDQzLjY0Nzk0OTIyIEMxMTQuMjI0Njc4OTQg"
    "NDcuMDk5OTkyOTkgMTE3LjQ4NjUzNzM2IDUwLjUyOTgzODI3IDEyMC40OTYzMzc4OSA1NC4zNzA2MDU0"
    "NyBDMTIwLjg5NTMwMjczIDU0Ljg3ODk3OTQ5IDEyMS4yOTQyNjc1OCA1NS4zODczNTM1MiAxMjEuNzA1"
    "MzIyMjcgNTUuOTExMTMyODEgQzEzNC42ODk5Mzk2MiA3Mi42MTU3OTU2NSAxNDQuNzA3MjA2OTQgOTAu"
    "OTQ5MTcyOTcgMTUwLjQ5NjMzNzg5IDExMS4zNzA2MDU0NyBDMTUwLjcyOTE3NDggMTEyLjE4NTYxNTIz"
    "IDE1MC45NjIwMTE3MiAxMTMuMDAwNjI1IDE1MS4yMDE5MDQzIDExMy44NDAzMzIwMyBDMTU3Ljg0MTg3"
    "NDEzIDEzOC4xMDQzNTczOCAxNTguMjEzNTg2NyAxNjUuMDg3MzA2MTYgMTUxLjQ5NjMzNzg5IDE4OS4z"
    "NzA2MDU0NyBDMTUxLjE0MDU2MDkgMTkwLjc5NTk4NTc0IDE1MC43ODYzODQ3NSAxOTIuMjIxNzY2NTgg"
    "MTUwLjQzMzgzNzg5IDE5My42NDc5NDkyMiBDMTM5Ljk0MDgzMjgzIDIzNC4xNDE2MjE2NCAxMTIuNjAx"
    "ODgxNTkgMjY1LjcwMjc3OTcgNzcuNDk2MzM3ODkgMjg3LjE4MzEwNTQ3IEM3MC43NTY5NDM3MSAyOTAu"
    "OTc4NjQzNCA2My42NDQ1NzY3NiAyOTMuODU4ODQ1NTEgNTYuNDM0MzI2MTcgMjk2LjYyNDUxMTcyIEM1"
    "NC44MTA2NTc1MSAyOTcuMjQ5NTk3NTYgNTMuMTk3MDY3MjMgMjk3LjkwMDc3NzY2IDUxLjU4NjE4MTY0"
    "IDI5OC41NTgxMDU0NyBDMjUuMjA5MTg2ODcgMzA4LjUwMjg5Mjg5IC0xMC40NjY2OTI4OCAzMDkuMzgy"
    "OTE0MzUgLTM3LjUwMzY2MjExIDMwMS4zNzA2MDU0NyBDLTM4LjY0MTA5ODYzIDMwMS4wNDkxNDU1MSAt"
    "MzguNjQxMDk4NjMgMzAxLjA0OTE0NTUxIC0zOS44MDE1MTM2NyAzMDAuNzIxMTkxNDEgQy01MC45OTY5"
    "MzU4IDI5Ny41MDQ0MzkgLTYxLjMyNDA2Mjk0IDI5My4wMDU0NjY1NSAtNzEuNTAzNjYyMTEgMjg3LjM3"
    "MDYwNTQ3IEMtNzIuNDgwNjEwMzUgMjg2LjgzMDY0OTQxIC03Mi40ODA2MTAzNSAyODYuODMwNjQ5NDEg"
    "LTczLjQ3NzI5NDkyIDI4Ni4yNzk3ODUxNiBDLTgyLjE4MjI1MjgxIDI4MS40MDM0NTY1OSAtOTAuMDIw"
    "OTk0MjQgMjc2LjAxMzU5ODk2IC05Ny41MDM2NjIxMSAyNjkuMzcwNjA1NDcgQy05OC4yODg3MDExNyAy"
    "NjguNjgzOTM3OTkgLTk4LjI4ODcwMTE3IDI2OC42ODM5Mzc5OSAtOTkuMDg5NTk5NjEgMjY3Ljk4MzM5"
    "ODQ0IEMtMTA2LjY2NTQyNDM5IDI2MS4zMzQ1NDUxOCAtMTEzLjQyNTY4MTg2IDI1NC40NTQ1NTk0NCAt"
    "MTE5LjUwMzY2MjExIDI0Ni4zNzA2MDU0NyBDLTEyMC4zODkyNDgwNSAyNDUuMjA4NTE1NjMgLTEyMC4z"
    "ODkyNDgwNSAyNDUuMjA4NTE1NjMgLTEyMS4yOTI3MjQ2MSAyNDQuMDIyOTQ5MjIgQy0xMzkuODE5ODEw"
    "NTggMjE4LjY4NTY3ODY4IC0xNTAuNjkyMzQxMDYgMTg3LjQ0NjkxNjg1IC0xNTAuNjg4OTY0ODQgMTU2"
    "LjA4NTIwNTA4IEMtMTUwLjY5MTEzMjkzIDE1My44MzgzNDM0NiAtMTUwLjcwOTI3NDkzIDE1MS41OTE5"
    "ODg3MSAtMTUwLjcyODI3MTQ4IDE0OS4zNDUyMTQ4NCBDLTE1MC43ODAyMzA3MSAxMzYuNTQ2MTMwNDMg"
    "LTE0OS40NTI3NTIyMSAxMjQuMzE2Nzg4MDcgLTE0NS44MTYxNjIxMSAxMTEuOTk1NjA1NDcgQy0xNDUu"
    "NTU0MTYwMTYgMTExLjEwMDU5MzI2IC0xNDUuMjkyMTU4MiAxMTAuMjA1NTgxMDUgLTE0NS4wMjIyMTY4"
    "IDEwOS4yODM0NDcyNyBDLTEzNS43NzU0MDA1MiA3OC42ODU0Mzc0MyAtMTE3LjIyODgwMjQxIDUwLjU1"
    "NTQ1NTg3IC05MS41MDM2NjIxMSAzMS4zNzA2MDU0NyBDLTkwLjU5MTAwNTg2IDMwLjY2OTM1NTQ3IC04"
    "OS42NzgzNDk2MSAyOS45NjgxMDU0NyAtODguNzM4MDM3MTEgMjkuMjQ1NjA1NDcgQy04MS43OTg0MjEz"
    "MSAyNC4xNTg5NzYwOSAtNzQuNDgzNTEwNSAyMC4wNTk4NTUyIC02Ni44Nzg2NjIxMSAxNi4wNTgxMDU0"
    "NyBDLTY1LjkyNTA3ODEyIDE1LjU1NDMyMzczIC02NC45NzE0OTQxNCAxNS4wNTA1NDE5OSAtNjMuOTg5"
    "MDEzNjcgMTQuNTMxNDk0MTQgQy01NS4wMDA4MzA3NCA5LjkwMDQ5MTQ1IC00NS44NzYxMDgwNCA2LjQz"
    "MzE0MTY2IC0zNi4wMDM2NjIxMSA0LjI0NTYwNTQ3IEMtMzUuMzM0NjM4NjcgNC4wODk2Mjg5MSAtMzQu"
    "NjY1NjE1MjMgMy45MzM2NTIzNCAtMzMuOTc2MzE4MzYgMy43NzI5NDkyMiBDLTMxLjgyMzU1Mjk5IDMu"
    "MjgwNTM5NzUgLTI5LjY2NDUzNjc0IDIuODI1OTk1NDMgLTI3LjUwMzY2MjExIDIuMzcwNjA1NDcgQy0y"
    "Ni43NDEyNjIyMSAyLjE4OTY1MzMyIC0yNS45Nzg4NjIzIDIuMDA4NzAxMTcgLTI1LjE5MzM1OTM4IDEu"
    "ODIyMjY1NjIgQy0xNi44MzcyMDQ5NyAwLjAyMDU0MjkyIC04LjUwOTY4Mzk0IC0wLjAwMTYyNzg3IDAg"
    "MCBaICIgZmlsbD0iI0I4NzMzMyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjQyLjUwMzY2MjEwOTM3NSw5"
    "Ny42MjkzOTQ1MzEyNSkiLz48cGF0aCBkPSJNMCAwIEM4LjQzMjU5MjI3IC0wLjA2OTgxNTE0IDE2Ljg2"
    "NTA2MTc4IC0wLjEyMjk2OTk4IDI1LjI5Nzg3MjU0IC0wLjE1NTQzNjUyIEMyOS4yMTQ0NzQwNSAtMC4x"
    "NzEwMjY2MSAzMy4xMzA4NzYzNyAtMC4xOTIxNDE0NyAzNy4wNDczNjMyOCAtMC4yMjYzMTgzNiBDNDAu"
    "ODM0MDAwMiAtMC4yNTkxNTE2MSA0NC42MjA0NDY3MiAtMC4yNzY5MDI5NCA0OC40MDcyMTUxMiAtMC4y"
    "ODQ2MzE3MyBDNDkuODQ0NzYzMzYgLTAuMjkwMTMyNiA1MS4yODIzMDIzNiAtMC4zMDA4NzMyOSA1Mi43"
    "MTk3Njg1MiAtMC4zMTcxOTAxNyBDNjYuMTIxNDQ2NDkgLTAuNDYzMTI3NDMgNzcuODU1NDQ0NTUgMS40"
    "NzgzNTUxIDg4LjA0Mjk2ODc1IDEwLjg4NjcxODc1IEM5Ny42NDUzMjg4IDIxLjMwODA0MzQxIDk4LjUw"
    "NzIxNzggMzEuMzk4NTU0MzEgOTggNDUgQzk2LjgzNjQyNTY5IDU2LjQ4NjE0MDcyIDkwLjYwMDI2MjQ5"
    "IDY2LjQ5NzM2ODYxIDgyIDc0IEM3Ni4yMjMzMzQ4NCA3Ny42NjA1MzQ2MSA3MC44MDE0MTQgODAuMTAz"
    "MjIwOTcgNjQgODEgQzY4Ljk5NDIwMDg0IDg2LjU4Njk0NjkgNzQuMDMxMDcwNTYgOTIuMTI5MDg2NDgg"
    "NzkuMTI1IDk3LjYyNSBDODIuMjU1MzMwMjQgMTAxLjAwMzE3NjM1IDg1LjM2OTg1MjYxIDEwNC4zODQx"
    "NzIyMiA4OC4zNzUgMTA3Ljg3NSBDOTIuMzY4NDEyMDkgMTEyLjQ5NDgyOTY3IDk2LjU3MjE4ODQ0IDEx"
    "Ni45MTg0ODc1NSAxMDAuNzQ3ODAyNzMgMTIxLjM3MjgwMjczIEMxMDQuMDE1NDMxMzkgMTI0Ljg2MjE3"
    "MTA2IDEwNy4yNTU2ODAzNyAxMjguMzY5MjczNDMgMTEwLjQzNzUgMTMxLjkzNzUgQzExNC40MzMyNTQx"
    "MyAxMzYuMzk3MTgwNjMgMTE4LjQ4NTY5MDc0IDE0MC44MDE5ODU4MyAxMjIuNTYyNSAxNDUuMTg3NSBD"
    "MTIzLjE3NjAxMzE4IDE0NS44NTMyMjAyMSAxMjMuNzg5NTI2MzcgMTQ2LjUxODk0MDQzIDEyNC40MjE2"
    "MzA4NiAxNDcuMjA0ODMzOTggQzEyOC4xNjA0MTczMSAxNTEuMjEwNjQxMDMgMTMyLjA1MDk1NDM4IDE1"
    "NC45MDEyNjEyMyAxMzYuMjEyMTU4MiAxNTguNDY2MDY0NDUgQzEzOC4yOTgyMzc0NCAxNjAuMjU1ODgy"
    "MjcgMTQwLjI5OTc5MTI2IDE2Mi4xMjg0NjMyMiAxNDIuMzEyNSAxNjQgQzE0OC43NzU3NzQzNiAxNjku"
    "NzU4Nzk5ODIgMTU2LjEzNzE5MTg1IDE3NC4zODczNTg0MiAxNjQgMTc4IEMxNjYuNDAyNTY3NjggMTY1"
    "LjM4NjUxOTcgMTY2LjA5Nzk0MDM1IDE1Mi45NjE4MDcxNiAxNTkgMTQyIEMxNTIuMjk5NTQ3NTcgMTMz"
    "LjAyODY4Mjk0IDE0My4zMjk0NjU2OSAxMjYuMzM3NjQ0MTkgMTM0LjQ2NDg0Mzc1IDExOS42NDA2MjUg"
    "QzEzMC4wMzk0OTMwNyAxMTYuMjg5NTExOTkgMTI1LjcxNDQyOTkyIDExMi44MTQzNDk2MSAxMjEuMzk1"
    "NzUxOTUgMTA5LjMyNzM5MjU4IEMxMTguNjM3NDE1MjMgMTA3LjEwMTM3Mjc2IDExNS44NzQzMzc0MSAx"
    "MDQuOTA1NjcwMTcgMTEzLjAzOTA2MjUgMTAyLjc3NzM0Mzc1IEMxMDcuMzc5MTUzNTUgOTguNTAyNjY3"
    "NzcgMTAzLjQ1NjQ5ODgxIDk0LjIxMjM1NTk3IDEwMCA4OCBDOTkuNjU0NTMxMjUgODcuMzg2NzI4NTIg"
    "OTkuMzA5MDYyNSA4Ni43NzM0NTcwMyA5OC45NTMxMjUgODYuMTQxNjAxNTYgQzk1Ljc1NzMzNjg3IDc4"
    "Ljk2MDkwMTM5IDk2LjkwODI5NTg1IDY3LjUyNzA0NDE4IDk5LjE2Nzk2ODc1IDYwLjIyNjU2MjUgQzEw"
    "MC41OTk5MTExNiA1Ny4zMDM3ODAzIDEwMi4xNDQxMTIwNiA1NC42NzAzNDIzNiAxMDQgNTIgQzEwNC4z"
    "ODI4NTE1NiA1MS4zOTE1NjI1IDEwNC43NjU3MDMxMyA1MC43ODMxMjUgMTA1LjE2MDE1NjI1IDUwLjE1"
    "NjI1IEMxMDkuNTc1NzY1OSA0My45NTIyMzkzIDExNy43Nzc3OTM1NiAzOS44NDM5Njc2IDEyNSAzOCBD"
    "MTI4LjMxNjk3MjE0IDM3LjcxOTA4MTQgMTMxLjYxMDM1NTg4IDM3LjcxNjMyODcxIDEzNC45Mzc1IDM3"
    "Ljc1IEMxMzYuMzE4NDQ4NDkgMzcuNzU1ODAwNzggMTM2LjMxODQ0ODQ5IDM3Ljc1NTgwMDc4IDEzNy43"
    "MjcyOTQ5MiAzNy43NjE3MTg3NSBDMTQ1LjY0MTU4Njg1IDM3Ljg2MDY3MzE3IDE1My4xOTA2ODgxNiAz"
    "OC43Mzc4ODkgMTYxIDQwIEMxNjEgNDguNTggMTYxIDU3LjE2IDE2MSA2NiBDMTYwLjM0IDY2IDE1OS42"
    "OCA2NiAxNTkgNjYgQzE1OC45MDIwMzEyNSA2NS40MTk5MjE4OCAxNTguODA0MDYyNSA2NC44Mzk4NDM3"
    "NSAxNTguNzAzMTI1IDY0LjI0MjE4NzUgQzE1Ny43MDQyMzIyOCA1OS4wMjM4MzQxNyAxNTYuNjYxNDI5"
    "OTUgNTUuMDI3NTcyOTUgMTUzIDUxIEMxNDUuMTA3NjA0NjMgNDYuMjE3OTA4MjMgMTM4LjIzMDQ2MzY2"
    "IDQ0LjExMTUwNjE3IDEyOSA0NSBDMTIxLjY0MTc4OTEyIDQ3LjA3NjU1MDMxIDExNy40MTkzNTIyMyA1"
    "MC45OTIxNTY2OSAxMTIuNjg3NSA1Ni44NzUgQzEwOS4zMTc0MTkwMiA2My4xMzM3MjE4MSAxMDkuOTg1"
    "MDg5NjMgNzEuNzUyMTYzMjMgMTExLjU4OTg0Mzc1IDc4LjQ2ODc1IEMxMTUuNTQ1NjcwOCA4Ny42NTY0"
    "NzczNCAxMjUuODI3NTcyNTcgOTMuNTA0MzcyNDYgMTMzLjUzNTE1NjI1IDk5LjM1OTM3NSBDMTM5LjQx"
    "NjczNTYzIDEwMy44Mjk0NDIxNCAxNDUuMjEzMjExMzUgMTA4LjQwODIzNDU3IDE1MSAxMTMgQzE1Mi4w"
    "MDU0Njg3NSAxMTMuNzk2NjQwNjMgMTUzLjAxMDkzNzUgMTE0LjU5MzI4MTI1IDE1NC4wNDY4NzUgMTE1"
    "LjQxNDA2MjUgQzE2Ni42MTkzOTA2OCAxMjUuNTIwNjk4MDQgMTc3LjgxOTA3NTU4IDEzNi41MDQ5MDY5"
    "MiAxODEgMTUzIEMxODEuOTExNDk5NDkgMTYyLjgzMzAwNDc0IDE4MS4xMjkyMTc4OCAxNzEuNjEyMzQ2"
    "MzUgMTc4IDE4MSBDMTgxLjMgMTgxLjMzIDE4NC42IDE4MS42NiAxODggMTgyIEMxODcuNjcgMTgyLjk5"
    "IDE4Ny4zNCAxODMuOTggMTg3IDE4NSBDMTg1Ljg5MjA1MDc4IDE4NS4wMDc3MzQzNyAxODUuODkyMDUw"
    "NzggMTg1LjAwNzczNDM3IDE4NC43NjE3MTg3NSAxODUuMDE1NjI1IEMxNzguNjY4MDAwMyAxODUuNDgw"
    "MjAzMjggMTc0LjkxMjgxNjc5IDE4Ni40NTk2OTk3NSAxNzAuNzI5MjQ4MDUgMTkxLjEzMDEyNjk1IEMx"
    "NjkuODIxNTUxNzkgMTkyLjIxNTg2MDYyIDE2OC45MTU0Nzk3NSAxOTMuMzAyOTU0MTIgMTY4LjAxMDk4"
    "NjMzIDE5NC4zOTEzNTc0MiBDMTYwLjIxNTcxMTg1IDIwMy43MTUwNjIgMTQ5LjgxODg5ODg2IDIwNy42"
    "MDM3Nzc3NSAxMzggMjA5IEMxMjEuODAwODc4MTQgMjEwLjEzMDg5MzA3IDEwNy42OTMyODAxNyAyMDcu"
    "NzM1MzU1NjMgOTQuNzgxMjUgMTk3LjE4NzUgQzg1LjkwNTg1MjMyIDE4OC45NzQ0NDU0MyA4MS4wMzY3"
    "NTg4NiAxNzcuMjE3ODY2NTQgODAuNTYyNSAxNjUuMTg3NSBDODAuODU5NzE1ODYgMTU1LjEyMDkyODIx"
    "IDg0LjE5ODI2NzEyIDE0Ni4zODQ3MjE3NyA4OS44MjgxMjUgMTM4LjEyMTA5Mzc1IEM5MS4zMjIzOTI0"
    "MSAxMzUuODIwMzUxMjMgOTEuMzIyMzkyNDEgMTM1LjgyMDM1MTIzIDkxIDEzMiBDODkuNDk2Njk3MDEg"
    "MTMwLjA0ODAzMjQ1IDg5LjQ5NjY5NzAxIDEzMC4wNDgwMzI0NSA4Ny40Mzc1IDEyOC4yNSBDODQuNzIz"
    "NDE5MjkgMTI1LjY2ODc3NjM4IDgyLjEyNzMwNTMyIDEyMy4wOTI0OTE2MyA3OS42ODc1IDEyMC4yNSBD"
    "NzYuNjkzMjA2MjEgMTE2Ljc2OTIxOTEyIDczLjYxMTU4NjEyIDExMy4zNzU3NDI3MSA3MC41IDExMCBD"
    "NjcuNDYwOTMzMDggMTA2LjY5OTg4Njk5IDY0LjQzODQzNDg2IDEwMy4zOTA1MDE3NiA2MS41IDEwMCBD"
    "NTAuNjAxNzYxMDMgODYuMzg4OTEzMDkgNTAuNjAxNzYxMDMgODYuMzg4OTEzMDkgMzcgNzYgQzM3IDc1"
    "LjAxIDM3IDc0LjAyIDM3IDczIEMzOC4wODc5Njg3NSA3Mi45NjI2MTcxOSAzOS4xNzU5Mzc1IDcyLjky"
    "NTIzNDM4IDQwLjI5Njg3NSA3Mi44ODY3MTg3NSBDNTQuNjI0MDM1NjkgNzIuMjkzMDkyNTMgNjUuNTc1"
    "NzYwMDQgNzAuOTY4ODc1NjMgNzYuMzEyNSA2MC44MTI1IEM4Mi4xMTg4OTY0NiA1MS4xMzUxNzI1NyA4"
    "Mi4yNTQ4MjU4NSAzOC45MzY3NzM0OSA4MC41MzEyNSAyOC4wMzUxNTYyNSBDNzguNjg5NjM4NzUgMjAu"
    "OTIwODM2NjEgNzQuOTA0Mjc2NTIgMTQuNzkwMzc0NzUgNjguODEyNSAxMC41NjI1IEM2NC4zMTkwNjM5"
    "NSA4LjA2NjE0NjY0IDYwLjUwODI1MjggNy44MDIzNjc5MyA1NS40ODgyODEyNSA3LjY4MzU5Mzc1IEM1"
    "NC43NjAwNTY2MSA3LjY2MjgxMjY1IDU0LjAzMTgzMTk3IDcuNjQyMDMxNTYgNTMuMjgxNTM5OTIgNy42"
    "MjA2MjA3MyBDNTAuOTU4NjIxMjUgNy41NTUzMTI1NCA0OC42MzU1OTA5NCA3LjQ5NjMyNzYzIDQ2LjMx"
    "MjUgNy40Mzc1IEM0NC43MzYzMTY2NSA3LjM5NDI5Njk1IDQzLjE2MDE0NDUyIDcuMzUwNjgyMDggNDEu"
    "NTgzOTg0MzggNy4zMDY2NDA2MiBDMzcuNzIyNzcwMjUgNy4xOTk2NTA0IDMzLjg2MTQ0Mzk3IDcuMDk4"
    "MzMwMzkgMzAgNyBDMzAuMDgzOTI1NzUgMjMuNzE1OTcwNDMgMzAuMTc5MDY4NjMgNDAuNDMxODMzNjUg"
    "MzAuMjg3NTI3MDggNTcuMTQ3NjYxMjEgQzMwLjMzNzYyNjUzIDY0LjkwOTI5MzIgMzAuMzg0MDY5NzMg"
    "NzIuNjcwOTE0NzcgMzAuNDIxODc1IDgwLjQzMjYxNzE5IEMzMC40NTQ4Mzk0IDg3LjE5ODU0MTIzIDMw"
    "LjQ5NDY5NTE0IDkzLjk2NDM4Mzc4IDMwLjU0Mjc5MDA2IDEwMC43MzAyMTc4MSBDMzAuNTY4MDEwOSAx"
    "MDQuMzExOTIzNCAzMC41ODk4MDUxMyAxMDcuODkzNTc1MjMgMzAuNjAzMzQzOTYgMTExLjQ3NTM0NTYx"
    "IEMzMC42MTg1OTU1IDExNS40NzYwMzI5MiAzMC42NDkyMzM2NCAxMTkuNDc2NDYxNzMgMzAuNjgxMTUy"
    "MzQgMTIzLjQ3NzA1MDc4IEMzMC42ODMzMTI1MyAxMjQuNjYxNzI0NCAzMC42ODU0NzI3MiAxMjUuODQ2"
    "Mzk4MDEgMzAuNjg3Njk4MzYgMTI3LjA2Njk3MDgzIEMzMC43MTA2NTA1MiAxMzQuNzQwMTExNDYgMzAu"
    "NzEwNjUwNTIgMTM0Ljc0MDExMTQ2IDMzIDE0MiBDMzUuNjc0Nzc1MTYgMTQzLjkwODkyMDc0IDM4LjU1"
    "NzUyNzA2IDE0NC40Njc3MjYxNiA0MS43NSAxNDUuMTI1IEM0Mi45NDg4MjgxMyAxNDUuMzc2MzY3MTkg"
    "NDIuOTQ4ODI4MTMgMTQ1LjM3NjM2NzE5IDQ0LjE3MTg3NSAxNDUuNjMyODEyNSBDNDQuNzc1MTU2MjUg"
    "MTQ1Ljc1Mzk4NDM3IDQ1LjM3ODQzNzUgMTQ1Ljg3NTE1NjI1IDQ2IDE0NiBDNDYgMTQ2LjY2IDQ2IDE0"
    "Ny4zMiA0NiAxNDggQzMwLjgyIDE0OCAxNS42NCAxNDggMCAxNDggQzAgMTQ3LjM0IDAgMTQ2LjY4IDAg"
    "MTQ2IEMxLjIxNjg3NSAxNDUuNzUyNSAyLjQzMzc1IDE0NS41MDUgMy42ODc1IDE0NS4yNSBDOC4yNDgz"
    "MzU4NCAxNDQuMTAzNzM2ODMgMTEuNTc5NTM1MzYgMTQyLjMwNDkzNjM2IDE0LjExNjA5ODQgMTM4LjE4"
    "ODk0NzY4IEMxNS4xNjE3NjQxOSAxMzUuNTk5Mzk3MzEgMTUuMjU3MDY2MDIgMTMzLjY0MjY3MTYzIDE1"
    "LjI2NzQyNTU0IDEzMC44NTE4MzcxNiBDMTUuMjgwMjIwNDkgMTI5LjI5MTU2Mjk2IDE1LjI4MDIyMDQ5"
    "IDEyOS4yOTE1NjI5NiAxNS4yOTMyNzM5MyAxMjcuNjk5NzY4MDcgQzE1LjI5MjM2NzU1IDEyNi41NjQw"
    "ODM4NiAxNS4yOTE0NjExOCAxMjUuNDI4Mzk5NjYgMTUuMjkwNTI3MzQgMTI0LjI1ODMwMDc4IEMxNS4y"
    "OTcyNDQ1NyAxMjMuMDU3OTExNjggMTUuMzAzOTYxNzkgMTIxLjg1NzUyMjU4IDE1LjMxMDg4MjU3IDEy"
    "MC42MjA3NTgwNiBDMTUuMzI2NjI1NjQgMTE3LjMzMTQwMTMxIDE1LjMzMzIzNzYxIDExNC4wNDIxOTYx"
    "MSAxNS4zMzQ1MTQxNCAxMTAuNzUyODA2MTkgQzE1LjMzNTkzNjc2IDEwOC42OTYzNzc1OCAxNS4zNDAy"
    "MDg0NiAxMDYuNjM5OTc1MzYgMTUuMzQ1NTA4NTggMTA0LjU4MzU1MzMxIEMxNS4zNjQwMDY0NSA5Ny40"
    "MDU0NTcyOCAxNS4zNzIxNzk1MSA5MC4yMjc0MzU0OCAxNS4zNzA2MDU0NyA4My4wNDkzMTY0MSBDMTUu"
    "MzY5NDA0MTkgNzYuMzY0NTU1MyAxNS4zOTA1MDQxOSA2OS42ODAxMTcxNCAxNS40MjIwOTI4IDYyLjk5"
    "NTQzNzc0IEMxNS40NDgyNjg1OCA1Ny4yNTA5MjE3NyAxNS40NTg5NzIyMiA1MS41MDY1MTEyIDE1LjQ1"
    "NzY5NDY1IDQ1Ljc2MTkzNjA3IEMxNS40NTcxODUzOCA0Mi4zMzMzMTMwOSAxNS40NjI4NDg0NyAzOC45"
    "MDQ5NzcxNSAxNS40ODQwNTA3NSAzNS40NzY0MTM3MyBDMTUuNTAzNjI2OTUgMzEuNjUwODMxOTggMTUu"
    "NDk3OTA0NTMgMjcuODI2MDgzMTkgMTUuNDg1ODM5ODQgMjQuMDAwNDg4MjggQzE1LjQ5NzA3ODg2IDIy"
    "Ljg2ODg1MjU0IDE1LjUwODMxNzg3IDIxLjczNzIxNjggMTUuNTE5ODk3NDYgMjAuNTcxMjg5MDYgQzE1"
    "LjQ2MDA5Nzc3IDEzLjExNjI4NDcgMTQuNTA5NjMwNjQgOS41MDk2MzA2NCA5LjE4NzUgNC4xODc1IEM2"
    "LjE5OTc1MTU3IDIuNTY1NTc5NDIgMy4zNTQ3MDQ5OSAyLjMyMjU2Nzc5IDAgMiBDMCAxLjM0IDAgMC42"
    "OCAwIDAgWiAiIGZpbGw9IiNmZmZmZmYiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDE1MiwxNDYpIi8+PHBh"
    "dGggZD0iTTAgMCBDMy44OTI1MjgxMiAxLjU1NzAxMTI1IDYuMDYxNDI5NzcgNC4wMTQzNDEwNiA4Ljgx"
    "MjUgNy4xMjUgQzkuNDc3MDUyIDcuODY4NTg3NjUgOS40NzcwNTIgNy44Njg1ODc2NSAxMC4xNTUwMjkz"
    "IDguNjI3MTk3MjcgQzEyLjA1MDA0MzY4IDEwLjc1NDA1NzY2IDEzLjkxNzEyODc0IDEyLjkwMTQwNTM5"
    "IDE1Ljc1IDE1LjA4MjAzMTI1IEMyOC42OTI3NTQ2NyAzMC40NTE1NTI0MiA0NS4wMzcxNTMwMiA0My42"
    "NDQ0Njk3NSA2NSA0OCBDNjEuNTIxMzIyMDkgNTUuNzc2ODUyMDYgNTMuNjgzNzg1OTIgNjAuMDE5MTE4"
    "NiA0NiA2MyBDMzUuMTk5NTcxNzQgNjUuNDEzNjc0MjEgMjEuNjU0NzIzNSA2NS44OTA0MjY5NyAxMiA2"
    "MCBDMy44NDIyNjMzNiA1NC43NjkyOTE3OSAtMy44NjYwMzcwNyA0Ny40MjkxNDAwNCAtNi41NjI1IDM3"
    "LjgzOTg0Mzc1IEMtOC4yNTc1NDQ2MSAyNi44MzcxODgxNCAtNy45NzQzNDg0NCAxNi4xMDkxNTk3MyAt"
    "MyA2IEMtMi42OTE5MTQwNiA1LjM0MTI4OTA2IC0yLjM4MzgyODEzIDQuNjgyNTc4MTMgLTIuMDY2NDA2"
    "MjUgNC4wMDM5MDYyNSBDLTEuNDEzNTQ0NTEgMi42NTEzMjY2NiAtMC43MTQxNzg0NiAxLjMyMTIzMDE2"
    "IDAgMCBaICIgZmlsbD0iI0I4NzMzMyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjQ2LDI4MykiLz48L3N2"
    "Zz4="
)

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

          <!-- header band — dir=ltr forces logo to physical left in RTL email -->
          <tr>
            <td bgcolor="{well}" dir="ltr"
                style="background:{well};padding:16px 36px;
                       border-bottom:1px solid {border};">
              <table cellpadding="0" cellspacing="0" dir="ltr">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;width:40px;">
                    <img src="data:image/svg+xml;base64,{logo_b64}"
                         alt="RS" width="40" height="40"
                         style="display:block;width:40px;height:40px;">
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:11px;font-weight:600;letter-spacing:4px;
                                 text-transform:uppercase;color:{copper};
                                 font-family:Arial,sans-serif;">RS Recruiting</span>
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
    return _BASE.format(
        subject=subject,
        void=_VOID,
        card=_CARD,
        well=_WELL,
        border=_BORDER,
        copper=_COPPER,
        lo=_TEXT_LO,
        logo_b64=_LOGO_B64,
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


def build_rejection_html(company_name: str) -> str:
    """HTML rejection email sent when admin rejects a company registration."""
    body = (
        _h("בקשת ההרשמה נדחתה")
        + _p(f"בקשת ההרשמה של <strong>{company_name}</strong> לא אושרה.")
        + _p(
            "אם אתם סבורים שמדובר בטעות, אנא צרו קשר עם צוות RS Recruiting.",
            muted=True,
        )
    )
    return _wrap("עדכון בנושא בקשת ההרשמה — RS Recruiting", body)


def build_new_registration_html(
    company_name: str,
    company_id: str,
    address: str,
    contact_name: str,
    email: str,
    mobile: str,
    admin_url: str,
) -> str:
    """HTML notification sent to admins when a new company registers."""
    body = (
        _h("חברה חדשה ממתינה לאישור")
        + _p(f"<strong>{company_name}</strong> השלימה את תהליך ההרשמה.")
        + _rule()
        + _p(f"שם חברה: <strong>{company_name}</strong>")
        + _p(f"ח.פ: {company_id}")
        + _p(f"כתובת: {address}")
        + _p(f"איש קשר: {contact_name}")
        + _p(f'דוא"ל: {email}')
        + _p(f"נייד: {mobile}")
        + _cta(admin_url, "מעבר לניהול חברות")
    )
    return _wrap("בקשת הרשמה חדשה — RS Recruiting", body)


def build_new_job_html(
    job_title: str,
    company_name: str,
    location: str,
    job_id: int,
    admin_url: str,
) -> str:
    """HTML notification sent to admins when a new job is submitted for approval."""
    body = (
        _h("משרה חדשה ממתינה לאישור")
        + _rule()
        + _p(f"כותרת: <strong>{job_title}</strong>")
        + _p(f"חברה: {company_name}")
        + _p(f"מיקום: {location}")
        + _p(f"מזהה משרה: #{job_id}")
        + _cta(admin_url, "מעבר לניהול משרות")
    )
    return _wrap("משרה חדשה לאישור — RS Recruiting", body)


def build_job_updated_html(
    job_title: str,
    company_name: str,
    location: str,
    job_id: int,
    status: str,
    admin_url: str,
) -> str:
    """HTML notification sent to admins when a job posting is updated."""
    body = (
        _h("פרסום משרה עודכן")
        + _rule()
        + _p(f"כותרת: <strong>{job_title}</strong>")
        + _p(f"חברה: {company_name}")
        + _p(f"מיקום: {location}")
        + _p(f"מזהה משרה: #{job_id}")
        + _p(f"סטטוס: {status}")
        + _cta(admin_url, "מעבר לניהול משרות")
    )
    return _wrap("עדכון פרסום משרה — RS Recruiting", body)


def build_application_status_candidate_html(
    candidate_name: str,
    job_title: str,
    old_status: str,
    new_status: str,
    notes: str | None,
) -> str:
    """HTML status update email sent to the candidate."""
    body = (
        _h("עדכון סטטוס מועמדות")
        + _p(f"שלום {candidate_name},")
        + _p(f"סטטוס מועמדותך למשרת <strong>{job_title}</strong> עודכן.")
        + _rule()
        + _p(f"סטטוס קודם: {old_status}")
        + _p(f"סטטוס חדש: <strong>{new_status}</strong>")
        + (_p(f"הערות: {notes}", muted=True) if notes else "")
    )
    return _wrap(f"עדכון מועמדות — {job_title}", body)


def build_application_status_company_html(
    company_name: str,
    job_title: str,
    candidate_name: str,
    old_status: str,
    new_status: str,
    notes: str | None,
) -> str:
    """HTML status update email sent to the company."""
    body = (
        _h("עדכון סטטוס מועמדות")
        + _p(f"שלום {company_name},")
        + _p(f"סטטוס מועמדות למשרת <strong>{job_title}</strong> עודכן.")
        + _rule()
        + _p(f"מועמד: {candidate_name}")
        + _p(f"סטטוס קודם: {old_status}")
        + _p(f"סטטוס חדש: <strong>{new_status}</strong>")
        + (_p(f"הערות: {notes}", muted=True) if notes else "")
    )
    return _wrap(f"עדכון מועמדות — {job_title}", body)
