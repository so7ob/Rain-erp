# Rain-erp interface and Arabic adaptation

## Context and direction

Rain-erp is an administration application for organization staff. The current Arabic work preserves its Vue/Element Plus shell and brand assets while making authentication and profile management clear in Arabic. Its direction is utilitarian, legible, consistent and calm: visible field labels, readable feedback, predictable actions and enough space for translated text. The aesthetic is clear Arabic administration. Light and dark modes are both required.

The existing Rain-erp screens are the reference for composition, component hierarchy and icons. This file records the localization adapter; it does not declare the rest of the inherited UI accepted. Full product acceptance remains under Issue #15.

## Typography, layout and components

The inherited type scale remains in place: normal controls use the Element Plus body size, and the authentication title retains its existing 24/30px classes. A global Arabic font audit remains pending; no new remote font dependency is introduced by this batch.

Authentication keeps the existing brand/welcome panel on desktop and the form on smaller screens. Forms expand vertically rather than clipping tall translations. Alternative sign-in actions occupy full rows at small widths and three columns when space permits. Help links wrap. Profile cards use one column below 768px and a 1:2 split otherwise, with logical text alignment and wrapping for mixed user data. On smaller screens profile tabs wrap, with an underline on the selected tab. The header keeps language/user controls visible and lets the remaining actions scroll horizontally when space is limited; every action retains its existing activation and permission conditions.

Primary actions are filled; alternative actions are outlined; auxiliary actions use text buttons. Every input has a visible label. Language and provider actions use native buttons with accessible names. Existing invalid fields revalidate after a language change, while untouched fields and entered values remain intact. Stored names, identifiers and user text keep their original content and direction as appropriate.

The existing Element Plus spacing/radius/surface tokens remain authoritative outside the explicit adapter. Local gaps use the existing 4px rhythm: 8px between alternative action rows and 12px between profile cards. This work adds no new decorative cards, imagery or shadows. Existing product/provider icon sets and brand illustrations are retained.

## Color tokens and adapter

The inherited blue accent is darkened within authentication and profile content so small text and filled buttons meet contrast requirements. The darker action fill is shared across modes; dark-mode links use a lighter accent. Profile reset buttons use a darker red. Other semantic, surface and border roles continue to use Element Plus theme variables.

| Role | Token/value |
| --- | --- |
| Light accent | `--el-color-primary: oklch(0.49 0.19 264)`, fallback `#2554ca` |
| Dark link accent | `--el-color-primary: oklch(0.78 0.12 255)`, fallback `#82baff` |
| Filled action | `--rain-auth-action-bg: oklch(0.49 0.19 264)`, fallback `#2554ca` |
| Action hover/active | `--rain-auth-action-hover: oklch(0.43 0.18 264)`, fallback `#1943b0` |
| Action foreground | `--rain-auth-action-text: oklch(1 0 0)`, fallback `#fff` |
| Profile reset action | `#b91c1c`, hover `#991b1b`, foreground `#fff` |
| Surface/text/border | Existing `--el-bg-color`, `--el-text-color-*`, `--el-border-color` |

The SCSS adapter is `frontend/src/styles/auth.scss`, scoped to the existing login namespace and `.profile-layout`. It adjusts the accent and action colors within these surfaces. Saved organization theme settings continue to control the surrounding application.

## Direction, motion and accessibility

Arabic uses document `lang=ar` and `dir=rtl`; English and Chinese use LTR. Inputs accept mixed text with automatic direction. CAPTCHA coordinate/drag interactions retain LTR inside their own container. Profile values wrap and use logical alignment; no image or coordinate system is mirrored globally.

The inherited entrance motion is disabled when reduced motion is requested. Native/Element Plus focus styles remain visible. Label text, validation errors and control names follow the selected language. Arabic counting supports zero, one, two, few, many and other.

Authentication and the owned profile content are checked with axe at widths 375/1280 in both modes, plus keyboard and functional localization tests. Profile scans cover the initial viewport and the form after scrolling. This verifies the covered content; inherited shell controls, CAPTCHA keyboard alternatives, external provider pages and global module RTL require their own acceptance evidence. No automated result is represented as a complete screen-reader audit.

## Review record

2026-10-30: adapted the existing authentication/profile composition for Arabic, corrected small-text/action contrast and responsive action/tab wrapping, added semantic headings and native controls, and preserved application data and validation boundaries. Local configuration/catalog checks and 17 production-browser cases passed, including the scoped axe matrix in both modes at 375/1280. Issue #19 records the reviewed delivery and CI evidence. Complete product acceptance remains open under #15.
