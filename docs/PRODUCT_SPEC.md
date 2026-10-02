# FAMILYTREE — COMPLETE PRODUCT PLANNING, DESIGN & BUILD PROMPT

> This is the authoritative product brief for **FamilyTree**.
> It is a source document, not an implementation guide. Architecture decisions live in
> `ARCHITECTURE.md`, scope decisions in `PRODUCT_PLAN.md`, and so on.
> Where this brief and an engineering decision conflict, the decision docs record *why*.

You are the **lead product architect, senior UX/UI designer, senior software architect, database architect, full-stack engineer, security engineer, and QA engineer** for this project.

Your responsibility is to take this product from:

**Idea → Product Requirements → UX → Architecture → Database → Implementation → Testing → Deployment → Production Readiness**

Do not immediately start generating random code.

First understand the product and inspect the existing project/repository.

Then create a detailed implementation plan.

Then execute the plan systematically.

This is a **standalone FamilyTree product**.

Do not associate it with another application, project, repository, brand, or product.

---

## 1. PRODUCT VISION

Build a modern digital family-history platform called **FamilyTree**.

The exact final product name, branding, colors, logo, and visual identity can be changed later.

The application is much more than a genealogy chart.

It should combine:

- Family Tree
- Genealogy
- Family History
- Family Stories
- Photos
- Videos
- Audio memories
- Historical documents
- Family events
- Family timeline
- Places
- Family collaboration
- Relationship discovery
- Private family community
- Long-term family archive

The central idea is:

> **A digital home where families can preserve, explore, and pass down their history across generations.**

The application should make users feel that their family's history is being preserved for future generations.

---

## 2. PRODUCT PHILOSOPHY

The application should be:

- Beautiful
- Emotional
- Modern
- Simple
- Fast
- Private
- Family-oriented
- Easy for older family members
- Powerful for large families
- Mobile-friendly
- Desktop-friendly
- Accessible
- Scalable

Do not make it feel like an outdated genealogy database.

The experience should feel closer to a combination of:

- A modern family archive
- An interactive genealogy application
- A private family space
- A digital family museum

But do not copy the UI or branding of existing products.

Create an original product.

---

## 3. DEVELOPMENT APPROACH

Before coding:

### Step 1 — Inspect the repository

Determine:

- Existing framework
- Programming language
- Database
- Authentication
- Storage
- Existing components
- Existing screens
- Existing APIs
- Existing configuration
- Existing dependencies
- Existing tests

Do not destroy working code.

Do not replace the entire architecture without a reason.

### Step 2 — Create the product plan

Create:

`docs/PRODUCT_PLAN.md`

Include:

- Product vision
- Target users
- User problems
- User journeys
- Feature list
- MVP
- V1
- Future roadmap
- Functional requirements
- Non-functional requirements
- Risks
- Technical assumptions

### Step 3 — Create the technical architecture

Create:

`docs/ARCHITECTURE.md`

Document:

- Frontend architecture
- Backend architecture
- Database architecture
- Authentication
- Authorization
- File storage
- Search
- Tree visualization
- Notifications
- APIs
- Security
- Deployment
- Scalability

### Step 4 — Create the database design

Create:

`docs/DATABASE.md`

Document:

- Entities
- Tables/collections
- Relationships
- Primary keys
- Foreign keys
- Indexes
- Constraints
- Security rules
- Data ownership
- Soft deletion
- Audit history

### Step 5 — Create the UI/UX specification

Create:

`docs/UI_UX.md`

Document:

- Navigation
- Screens
- Components
- User flows
- Responsive behavior
- Empty states
- Loading states
- Error states
- Accessibility
- Mobile behavior
- Desktop behavior

---

## 4. TARGET USERS

Design for several types of users.

**Individual** — Someone who wants to document their family.

**Parent** — Someone who wants to preserve their children's and parents' history.

**Grandparent** — Someone who wants to tell stories and preserve memories.

**Family Historian** — Someone researching several generations.

**Extended Family** — Relatives who want to contribute information.

**Younger Generation** — People who want to discover their family's history.

The application should not assume that every user is technically experienced.

---

## 5. CORE PRODUCT STRUCTURE

The application should have these major areas:

1. Dashboard
2. Family Tree
3. People
4. Stories
5. Memories
6. Photos
7. Videos
8. Audio
9. Documents
10. Events
11. Timeline
12. Places
13. Relationship Finder
14. Family Members
15. Family Invitations
16. Activity Feed
17. Search
18. Notifications
19. Settings
20. Privacy
21. Account

Do not necessarily implement every feature in the first release.

Determine a sensible MVP.

---

## 6. ACCOUNT SYSTEM

Users should be able to create an account.

Support:

- Email/password
- Secure authentication
- Email verification
- Password reset
- Session management
- Logout
- Account deletion

If the chosen backend supports OAuth, consider:

- Google
- Apple

Do not add unnecessary authentication providers if they complicate the MVP.

---

## 7. FAMILY CREATION

After registration, a user should be able to create a family.

Example:

```text
Create Your Family

Family Name
[ Abraham Family ]

Family Description
[ Our family history... ]

Family Photo
[ Upload ]

[Create Family]
```

The creator becomes:

**Family Owner**

---

## 8. FAMILY ONBOARDING

After creating a family, guide the user through a simple setup.

Possible flow:

```text
Create Family
      ↓
Add Yourself
      ↓
Add Parents
      ↓
Add Spouse
      ↓
Add Children
      ↓
Upload Family Photo
      ↓
Explore Family Tree
```

Every step should be optional where appropriate.

Never force the user to enter information they don't have.

---

## 9. FAMILY TREE

This is the primary feature.

Users should be able to create and explore a visual family tree.

Support:

- Parents
- Children
- Siblings
- Spouses
- Multiple spouses
- Step-parents
- Stepchildren
- Adoptive relationships
- Half-siblings
- Extended relationships

The tree must represent relationships accurately.

---

## 10. FAMILY TREE INTERACTION

Users should be able to:

- Zoom
- Pan
- Center
- Fit tree to screen
- Expand branches
- Collapse branches
- Select people
- Search people
- Jump to a person
- Highlight a branch
- Highlight relationship paths
- Open profiles
- Add relatives directly from the tree

The tree should work on:

- Desktop
- Tablet
- Mobile

---

## 11. LARGE FAMILY SUPPORT

Do not design the tree only for 10–20 people.

A family could eventually contain:

- 100 people
- 500 people
- 1,000 people
- More

Design the data model and rendering system for large graphs.

Avoid loading unnecessary information.

Use:

- Lazy loading
- Virtualization where appropriate
- Efficient graph calculations
- Incremental rendering
- Server-side querying where appropriate

---

## 12. TREE VIEWS

Architect the system so multiple views can exist.

**Traditional Tree** — Ancestors and descendants arranged vertically.

**Ancestor View** — Start from one person and show their ancestors.

**Descendant View** — Start from one person and show descendants.

**Radial View** — A person in the center with generations surrounding them.

**Compact Mobile View** — Optimized for phones.

MVP does not have to contain every view.

Prioritize the most usable view first.

---

## 13. PERSON ENTITY

Every family member should be represented as a person entity.

Possible fields:

- ID
- First name
- Middle name
- Last name
- Nickname
- Display name
- Gender
- Profile image
- Cover image
- Birth date
- Birth date precision
- Birth place
- Death date
- Death date precision
- Death place
- Biography
- Occupation
- Education
- Languages
- Current location
- Previous locations
- Notes
- Privacy settings
- Created by
- Created date
- Updated date

Do not require all fields.

---

## 14. PERSON PROFILE

Clicking a person should open a beautiful profile.

Example:

```text
[Profile Photo]

Abebe Abraham
1948 — 2019

Grandfather

Born
Gondar, Ethiopia

Occupation
Teacher

About
...

Family
Parents
Spouse
Children
Siblings

Stories
Photos
Videos
Audio
Documents
Events
Places
```

The profile should feel like a mini biography.

---

## 15. RELATIONSHIPS

Relationships must be modeled separately from people.

Example:

```text
Person A
    ↓
Parent relationship
    ↓
Person B
```

Support relationship metadata where necessary.

Example:

- Biological
- Adoptive
- Step
- Legal
- Unknown

Do not hardcode family relationships into the UI.

The backend should be the source of truth.

---

## 16. MULTIPLE FAMILIES / FAMILY MEMBERSHIP

A user account and a person entity should not necessarily be the same thing.

For example:

A person may exist in the family tree without having an account.

A living family member may later claim or link their profile.

Design this carefully.

Potential model:

```text
User
   ↓
Family Membership
   ↓
Family
   ↓
Person
```

This allows historical people to exist without accounts.

---

## 17. FAMILY ROLES

Support:

**Owner** — Full control.

**Admin** — Family management.

**Contributor** — Can add and edit permitted content.

**Viewer** — Can view permitted content.

Potentially later:

**Historian** — Focused on genealogy and historical records.

Do not overcomplicate MVP permissions.

---

## 18. INVITATIONS

Allow family members to invite relatives.

Support:

- Email invitation
- Invitation link
- Invitation code
- Accept invitation
- Reject invitation
- Revoke invitation
- Expiration
- Role assignment

Invited users should only gain access after accepting.

---

## 19. PRIVACY

Privacy is critical.

Support visibility levels such as:

**Private** — Only the creator or explicitly authorized people.

**Family** — Members of the family.

**Selected Members** — Specific people.

**Public** — Only when intentionally enabled.

The system must enforce permissions on the backend.

Never rely only on frontend hiding.

---

## 20. LIVING PERSON PRIVACY

Treat information about living people carefully.

Potentially restrict:

- Exact birth dates
- Contact information
- Private notes
- Documents
- Sensitive events

Provide privacy controls.

The default should favor privacy.

---

## 21. FAMILY DASHBOARD

Create a beautiful dashboard.

Example:

```text
Good morning 👋

Abraham Family

7 Generations
184 People
1,284 Photos
76 Stories
43 Documents

--------------------------------

Recent Activity

Sarah added 5 photos

Daniel added a story

Michael added a family member

--------------------------------

Upcoming

🎂 Hana's Birthday
💍 Wedding Anniversary
```

The dashboard should be useful, not just decorative.

---

## 22. FAMILY STATISTICS

Show useful family statistics.

Example:

- Number of people
- Number of generations
- Number of family branches
- Number of stories
- Number of photos
- Number of documents
- Number of events
- Number of places

Avoid unnecessary statistics.

---

## 23. FAMILY STORIES

Stories are a major part of the product.

Users should be able to create:

```text
Story Title
Story Content
Author
Date
Approximate Period
Location
People
Photos
Audio
Video
Documents
```

Example:

- Grandfather's Journey
- How Grandma Met Grandpa
- Our Family's Migration
- Childhood Memories
- Family Traditions
- The Story Behind Our Name

---

## 24. STORY EDITOR

Build a good writing experience.

Support:

- Title
- Rich text
- Images
- People references
- Locations
- Dates
- Attachments

Allow drafts.

Allow editing.

Allow deletion with confirmation.

---

## 25. FAMILY MEMORIES

A memory can contain:

- Photo
- Video
- Audio
- Document
- Text

Each memory can be connected to:

- Person
- Event
- Place
- Story
- Date

---

## 26. PHOTO SYSTEM

Create a family photo library.

Features:

- Upload
- Delete
- Albums
- Captions
- Descriptions
- Tags
- People association
- Event association
- Date
- Location

Views:

- Grid
- Album
- Timeline

---

## 27. PHOTO TAGGING

Allow users to manually tag family members in photos.

Example:

```text
Family Reunion — 1987

People:
Abebe
Hana
Daniel
Sarah
```

Clicking the person should open their profile.

Do not implement automatic facial recognition in MVP.

---

## 28. VIDEO SYSTEM

Allow family videos.

Example:

- Weddings
- Birthdays
- Family reunions
- Interviews
- Historical recordings

Support:

- Upload
- Title
- Description
- Date
- People
- Events
- Places
- Privacy

Use appropriate storage rather than storing large binary files directly in the database.

---

## 29. AUDIO MEMORIES

This should be especially useful for older generations.

Allow users to record or upload:

- Interviews
- Stories
- Family history
- Traditional stories
- Memories
- Messages

Example:

```text
🎙️ Grandma's Childhood Story

Recorded by:
Sarah

Person:
Grandmother Hana

Duration:
12:43

Transcript:
...
```

---

## 30. AUDIO TRANSCRIPTION

Design the system so transcription can be added.

Potential future support:

- English
- Amharic
- Other languages

Do not make transcription a hard dependency for MVP unless the chosen infrastructure supports it cleanly.

The original audio must always remain available.

---

## 31. FAMILY EVENTS

Support:

- Birth
- Marriage
- Death
- Graduation
- Baptism
- Birthday
- Anniversary
- Migration
- Career milestone
- Reunion
- Custom event

Events should contain:

- Name
- Type
- Date
- Date precision
- Location
- Description
- People
- Media
- Documents
- Stories

---

## 32. APPROXIMATE DATES

Historical information is often incomplete.

Support:

- Exact date
- Month/year
- Year only
- Approximate year
- Date range
- Unknown

Example:

```text
1948

circa 1948

1950–1953

June 1962
```

Do not force false precision.

---

## 33. FAMILY TIMELINE

Create a chronological timeline.

Example:

```text
1948
Abebe is born

1958
Abebe marries Hana

1960
First child is born

1965
Family moves to Addis Ababa

1990
First grandchild is born
```

Allow filtering by:

- Person
- Event
- Branch
- Location
- Date range

---

## 34. PLACES

Create a place system.

Example:

- Birthplace
- Residence
- School
- Workplace
- Marriage location
- Migration destination
- Death place
- Family hometown

A place should be reusable.

Do not create duplicate place records unnecessarily.

---

## 35. FAMILY MAP

Eventually provide a map showing important family locations.

Example:

```text
Gondar
   ↓
Addis Ababa
   ↓
Nairobi
   ↓
London
```

The architecture should support maps without making maps mandatory for MVP.

---

## 36. DOCUMENT ARCHIVE

Support:

- Birth certificates
- Marriage certificates
- Death certificates
- School certificates
- Letters
- Passports
- Church documents
- Historical records
- Newspaper articles
- Scanned documents

Documents should support:

- Title
- Description
- Date
- People
- Event
- Place
- File
- Privacy

---

## 37. FAMILY SEARCH

Create global family search.

Search across:

- People
- Stories
- Photos
- Videos
- Audio
- Documents
- Events
- Places

Example:

Search:

`Abebe`

Results:

```text
People
Abebe Abraham
Abebe Tesfaye

Stories
Grandfather Abebe's Journey

Photos
Abebe's Wedding

Documents
Abebe Marriage Certificate
```

Design the search architecture for growth.

---

## 38. RELATIONSHIP FINDER

Users should be able to select two people.

Example:

```text
Person A:
Me

Person B:
Michael

[Find Relationship]
```

The system should calculate the shortest meaningful family relationship path.

Example:

```text
You
 ↓
Father
 ↓
Grandfather
 ↓
Brother
 ↓
Michael
```

Show both:

- Visual path
- Human-readable relationship where confidently determinable

Do not hardcode relationship answers.

Calculate them from the graph.

---

## 39. FAMILY FEED

Create a private activity feed.

Example:

```text
Sarah added 5 photos

Daniel added a new story

Michael added a person

Hana's birthday is today

A new family branch was created
```

Respect permissions.

Do not reveal private activity.

---

## 40. NOTIFICATIONS

Support notifications for:

- Invitations
- Family contributions
- Comments if comments are implemented
- Mentions
- Birthdays
- Anniversaries
- Important family events
- Permission changes

Allow users to configure notifications.

---

## 41. FAMILY BIRTHDAYS

Automatically identify upcoming birthdays where the information is available and permitted.

Show:

```text
Upcoming Family Birthdays

🎂 Hana
October 4

🎂 Daniel
October 12
```

Do not expose exact dates to people who do not have permission.

---

## 42. FAMILY ANNIVERSARIES

Support:

- Wedding anniversaries
- Memorial dates
- Other important recurring events

Allow users to disable reminders.

---

## 43. FAMILY BRANCHES

Families may become very large.

Allow logical branches.

Example:

```text
Family

├── Abraham Branch
├── Daniel Branch
├── Michael Branch
└── Sarah Branch
```

Branches should be views of the same underlying family graph.

Do not duplicate people.

---

## 44. GENERATION NAVIGATION

Automatically identify generations where possible.

Allow:

```text
Generation 1
Generation 2
Generation 3
Generation 4
Generation 5
```

Users should be able to navigate directly to a generation.

---

## 45. FAMILY BOOK

Eventually allow users to generate a beautiful family-history book.

Example:

```text
THE ABRAHAM FAMILY

7 Generations

────────────────

Family Tree

────────────────

Our Ancestors

────────────────

Family Stories

────────────────

Important Events

────────────────

Family Photos

────────────────

Places

────────────────
```

Possible output:

- PDF
- Printable family book
- Digital archive

Do not prioritize this over core family-tree functionality.

---

## 46. EXPORT

Support eventual export of:

- Family tree
- People
- Stories
- Photos metadata
- Events
- Documents metadata

Consider genealogy interoperability such as:

**GEDCOM**

if appropriate for the architecture.

---

## 47. IMPORT

Eventually support importing existing genealogy data.

Potential:

- GEDCOM
- CSV
- Structured family data

Import should validate relationships before modifying the family tree.

Do not overwrite existing data silently.

---

## 48. AUDIT HISTORY

For important family information, consider tracking:

```text
Who changed it?
What changed?
When?
```

Example:

```text
Sarah changed Abebe's birth year

Previous:
1947

New:
1948

September 30, 2026
```

This is useful when several relatives collaborate.

---

## 49. CONFLICT HANDLING

Multiple family members may disagree about historical information.

Do not silently overwrite information.

Consider:

- Edit history
- Suggested corrections
- Verification
- Admin approval
- Notes
- Source references

This is particularly important for historical dates and relationships.

---

## 50. SOURCES / EVIDENCE

Allow family historians to optionally attach sources.

Example:

```text
Birth Year: 1948

Source:
Original birth certificate

Confidence:
Verified
```

Possible source types:

- Family document
- Interview
- Church record
- Government record
- Family member
- Photograph
- Other

Do not require sources for every piece of information.

---

## 51. FAMILY DISCUSSIONS

Potential future feature:

Allow comments/discussions around:

- Stories
- Photos
- Events
- People

Example:

> "I think this photograph was taken in 1978."

Another family member can respond.

Keep this secondary to the core archive.

---

## 52. FAMILY ADMINISTRATION

Family admins should be able to:

- Manage members
- Manage invitations
- Change roles
- Remove members
- Manage privacy
- Manage family settings
- Review activity
- Manage branches

Dangerous operations require confirmation.

---

## 53. ACCOUNT SETTINGS

Include:

- Profile
- Email
- Password
- Notifications
- Privacy
- Appearance
- Language
- Calendar
- Data export
- Account deletion

---

## 54. FAMILY SETTINGS

Include:

- Family name
- Family description
- Family photo
- Privacy
- Member permissions
- Invitation settings
- Default calendar
- Family visibility

---

## 55. ETHIOPIAN-FIRST CONSIDERATIONS

The product should be globally usable but should work particularly well for Ethiopian families.

Consider support for:

- Amharic names
- English names
- Amharic language
- Ethiopian calendar
- Gregorian calendar
- Ethiopian locations
- Ethiopian historical documents
- Church/family records
- Family migration history

The data model must support both:

```text
Ethiopian Calendar
Gregorian Calendar
```

Do not assume every user is Ethiopian.

---

## 56. MULTILINGUAL ARCHITECTURE

Prepare the system for internationalization.

At minimum architect for:

- English
- Amharic

Do not hardcode UI strings throughout the application.

Use a localization system.

---

## 57. ACCESSIBILITY

Support:

- Keyboard navigation
- Screen readers
- Good contrast
- Large touch targets
- Resizable text
- Focus states
- Semantic labels

Older family members should be able to use the application comfortably.

---

## 58. RESPONSIVE DESIGN

The application must work on:

**Desktop** — Large family-tree experience.

**Tablet** — Balanced tree and profile experience.

**Mobile** — Simplified navigation and compact tree experience.

Do not simply shrink the desktop UI.

Design mobile interaction intentionally.

---

## 59. UI/UX DIRECTION

The visual design should feel:

- Warm
- Elegant
- Modern
- Human
- Trustworthy
- Calm
- Premium without being complicated

Avoid:

- Generic SaaS dashboards
- Excessive gradients
- Excessive animations
- Clutter
- Tiny text
- Overly technical interfaces

The family tree should be the visual centerpiece.

---

## 60. DESIGN SYSTEM

Create a reusable design system.

Define:

- Typography
- Colors
- Spacing
- Border radius
- Shadows
- Buttons
- Inputs
- Cards
- Modals
- Dropdowns
- Tabs
- Navigation
- Tree nodes
- Timeline items
- Media cards
- Person cards
- Empty states
- Toasts
- Dialogs

Do not create every screen with completely different components.

---

## 61. IMPORTANT EMPTY STATES

Design meaningful empty states.

Example:

```text
Your family story starts here.

Add your first family member
and begin building your family tree.

[Add Family Member]
```

Do not show blank screens.

---

## 62. LOADING STATES

Create:

- Skeleton loaders
- Tree loading state
- Image loading
- Profile loading
- Search loading
- Upload progress

Do not freeze the interface during long operations.

---

## 63. ERROR HANDLING

Create useful error messages.

Bad:

> Error 500

Better:

> We couldn't upload this photo.
> Please check your connection and try again.

Errors should be understandable to nontechnical users.

---

## 64. FILE UPLOADS

Design secure file uploads.

Support appropriate limits for:

- Images
- Videos
- Audio
- Documents

Validate:

- File type
- File size
- Upload permissions

Do not trust client-side validation alone.

---

## 65. STORAGE ARCHITECTURE

Large files should live in object/file storage.

Do not store large videos or images directly inside relational database fields.

The database should store metadata and secure references.

Design:

```text
Database
    ↓
File Metadata
    ↓
Secure Storage
```

---

## 66. SECURITY

Treat family information as private data.

Implement:

- Authentication
- Authorization
- Secure database rules
- Secure file access
- Input validation
- Rate limiting where appropriate
- Secure sessions
- CSRF protection where applicable
- XSS prevention
- Secure API design
- Server-side permission validation

Never trust the client.

---

## 67. DATA OWNERSHIP

Clearly define:

Who owns a family?

Who owns a person record?

Who can edit it?

Who can delete it?

Who can view it?

Document these rules before implementation.

---

## 68. SOFT DELETE

Avoid immediately destroying important family data.

Where appropriate use:

- Soft deletion
- Trash/recovery
- Confirmation
- Audit history

For permanent deletion, require explicit confirmation.

---

## 69. DATABASE REQUIREMENTS

Design a normalized and scalable data model.

Likely entities may include:

```text
User
Family
FamilyMember
Person
Relationship
Invitation
Story
StoryPerson
Memory
Photo
Video
Audio
Document
Event
EventPerson
Place
PersonPlace
Album
AlbumItem
Tag
Notification
Activity
Branch
Source
ChangeHistory
```

Do not blindly implement this exact list.

Evaluate the relationships and design the correct schema.

Avoid unnecessary duplication.

---

## 70. API ARCHITECTURE

Create clean APIs/services.

Possible areas:

```text
/auth
/families
/people
/relationships
/stories
/memories
/photos
/videos
/audio
/documents
/events
/places
/search
/invitations
/notifications
/activity
```

Use consistent:

- Authentication
- Authorization
- Validation
- Error responses
- Pagination
- Filtering
- Sorting

---

## 71. SEARCH ARCHITECTURE

Start simple if appropriate.

For MVP, database-backed search may be sufficient.

Design so a dedicated search engine can be introduced later if necessary.

Do not add expensive infrastructure without need.

---

## 72. PERFORMANCE

Optimize for:

- Large trees
- Large photo libraries
- Large families
- Slow networks
- Mobile devices

Use:

- Pagination
- Lazy loading
- Image optimization
- Caching
- Efficient queries
- Database indexes
- Virtualization

Do not optimize prematurely, but do not design an architecture that cannot scale.

---

## 73. OFFLINE / NETWORK RESILIENCE

Evaluate whether selected parts of the app should support offline use.

Potential candidates:

- Recently viewed family tree
- Person profiles
- Draft stories
- Draft memories

Do not implement complex offline synchronization unless justified.

Document the decision.

---

## 74. TESTING

Implement tests throughout development.

### Unit tests

For:

- Relationship calculations
- Generation calculations
- Date handling
- Permission logic
- Data validation

### Integration tests

For:

- Authentication
- Family creation
- Adding people
- Relationships
- Uploads
- Invitations

### UI tests

For critical user flows.

### End-to-end tests

At least cover:

```text
Register
↓
Create Family
↓
Add Person
↓
Add Relationship
↓
View Tree
↓
Open Profile
↓
Add Story
↓
Invite Family Member
```

---

## 75. RELATIONSHIP ALGORITHM

Treat relationship calculation as a dedicated domain service.

It should be able to traverse:

- Parent-child relationships
- Spouse relationships
- Sibling relationships
- Extended relationships

Avoid implementing relationship calculations directly inside UI components.

Create reusable logic.

Test unusual family structures.

---

## 76. CALENDAR ARCHITECTURE

Dates may have:

- Gregorian
- Ethiopian
- Unknown
- Approximate
- Partial precision

Do not store everything as an arbitrary string.

Design a structured date model that supports future calendar systems.

---

## 77. SEARCHABLE FAMILY HISTORY

Everything should be discoverable without overwhelming the user.

Search should eventually support:

```text
People
Stories
Photos
Events
Places
Documents
```

Use filters.

---

## 78. MOBILE NAVIGATION

For mobile, consider:

```text
Home
Tree
People
Memories
More
```

Do not put 15 navigation items in a mobile bottom bar.

---

## 79. DESKTOP NAVIGATION

Potential structure:

```text
Family
├── Dashboard
├── Family Tree
├── People
├── Stories
├── Memories
├── Timeline
├── Events
├── Places
└── Documents

Family Management
├── Members
├── Invitations
└── Settings
```

Adjust after UX evaluation.

---

## 80. FIRST-TIME EXPERIENCE

The first screen should communicate the value immediately.

Possible message:

> "Your family's story starts here."

Then guide the user toward:

**Build your family tree**

The user should not be overwhelmed by advanced features on day one.

---

## 81. MVP DEFINITION

Before coding, determine the smallest meaningful MVP.

The MVP should probably include:

### Authentication

- Register
- Login
- Logout

### Family

- Create family
- Family dashboard
- Invite members

### People

- Add person
- Edit person
- Person profile

### Relationships

- Parents
- Children
- Spouses
- Siblings

### Tree

- Interactive family tree
- Search
- Basic navigation

### Memories

- Basic photo upload
- Photo gallery

### Stories

- Create story
- View story

### Privacy

- Family-level permissions

Do not allow advanced features to delay the core experience.

---

## 82. V1

After MVP, consider:

- Audio memories
- Video
- Documents
- Events
- Timeline
- Places
- Relationship finder
- Family feed
- Notifications
- Better permissions
- Branches
- Family search
- Ethiopian calendar
- Amharic support

---

## 83. FUTURE

Potential future features:

- AI-assisted story transcription
- AI-assisted historical organization
- OCR for old documents
- Advanced genealogy import
- GEDCOM support
- Family map
- Family book generator
- Printed family books
- Advanced relationship analysis
- Family traditions archive
- Family recipes
- Family achievements
- Family oral-history archive

AI features must remain optional.

The core application must work without AI.

---

## 84. FAMILY TRADITIONS

Consider eventually supporting a dedicated section for:

- Recipes
- Traditions
- Celebrations
- Cultural practices
- Family sayings
- Songs
- Stories
- Important customs

These should become part of the broader family archive.

---

## 85. FAMILY RECIPE ARCHIVE

Potential future feature:

```text
Grandma's Doro Wat

Submitted by:
Hana

Story:
This recipe has been in the family for generations.

Ingredients
...

Instructions
...

Photos
...
```

Recipes can be connected to people and stories.

This is optional and should not distract from the core genealogy product.

---

## 86. FAMILY LEGACY

The application should eventually allow a family to create a legacy archive.

Potential categories:

```text
Our People
Our Stories
Our Photos
Our Places
Our Traditions
Our Documents
Our Timeline
Our Memories
```

The long-term goal is to make the application useful across generations.

---

## 87. DATA PORTABILITY

Users should never feel trapped.

Plan for:

- Data export
- Family tree export
- Media metadata export
- Account deletion
- Family deletion
- Future genealogy formats

---

## 88. OBSERVABILITY

For production, implement appropriate:

- Error logging
- Performance monitoring
- API monitoring
- Upload monitoring
- Authentication monitoring

Do not collect unnecessary personal information.

---

## 89. ANALYTICS

If analytics are used, keep them privacy-conscious.

Useful product metrics may include:

- Families created
- People added
- Stories created
- Photos uploaded
- Invitations sent
- Active families

Avoid collecting unnecessary sensitive family information.

---

## 90. DOCUMENTATION

Maintain:

```text
docs/
├── PRODUCT_PLAN.md
├── ARCHITECTURE.md
├── DATABASE.md
├── UI_UX.md
├── API.md
├── SECURITY.md
├── TESTING.md
└── ROADMAP.md
```

Documentation must remain synchronized with implementation.

---

## 91. IMPLEMENTATION PHASES

Organize implementation into phases.

## PHASE 0 — Discovery

Inspect repository and existing code.

## PHASE 1 — Foundation

- Project structure
- Design system
- Authentication
- Database
- Core architecture

## PHASE 2 — Family

- Family creation
- Family dashboard
- Family settings
- Membership

## PHASE 3 — People

- Person model
- Person creation
- Person profiles
- Editing

## PHASE 4 — Relationships

- Relationship model
- Parent/child
- Spouse
- Sibling
- Relationship validation

## PHASE 5 — Family Tree

- Visualization
- Navigation
- Search
- Expand/collapse
- Tree performance

## PHASE 6 — Memories

- Photos
- Albums
- Uploads
- Tags

## PHASE 7 — Stories

- Story editor
- People association
- Media association

## PHASE 8 — Events & Timeline

- Events
- Timeline
- Birthdays
- Anniversaries

## PHASE 9 — Collaboration

- Invitations
- Roles
- Permissions
- Activity feed

## PHASE 10 — Advanced Family History

- Places
- Documents
- Audio
- Video
- Relationship finder

## PHASE 11 — Polish

- Accessibility
- Performance
- Responsive design
- Error handling
- Loading states

## PHASE 12 — Testing

- Unit
- Integration
- UI
- End-to-end

## PHASE 13 — Production

- Security review
- Environment configuration
- Database rules
- Storage rules
- Deployment
- Monitoring
- Backup strategy

---

## 92. CODING RULES

Follow these rules throughout development.

**Rule 1** — Do not create unnecessary complexity.

**Rule 2** — Do not duplicate logic.

**Rule 3** — Do not hardcode family data.

**Rule 4** — Do not put business logic inside UI components when it belongs in services/domain logic.

**Rule 5** — Do not expose private family data.

**Rule 6** — Do not store secrets in source code.

**Rule 7** — Use environment variables for secrets/configuration.

**Rule 8** — Validate all user input.

**Rule 9** — Handle loading, empty, success, and error states.

**Rule 10** — Keep components reusable.

**Rule 11** — Keep the database normalized where appropriate.

**Rule 12** — Use indexes for common queries.

**Rule 13** — Do not add dependencies without justification.

**Rule 14** — Prefer simple solutions over unnecessary infrastructure.

**Rule 15** — Do not implement future features just because they were mentioned.

Build the current phase first.

---

## 93. AI AGENT WORKFLOW

You must work in this order:

```text
INSPECT
   ↓
UNDERSTAND
   ↓
PLAN
   ↓
DOCUMENT
   ↓
DESIGN
   ↓
IMPLEMENT
   ↓
TEST
   ↓
REVIEW
   ↓
FIX
   ↓
DOCUMENT
   ↓
CONTINUE
```

Do not skip directly from the idea to massive implementation.

---

## 94. BEFORE EACH MAJOR PHASE

Before starting a phase:

1. Review the existing implementation.
2. Identify dependencies.
3. Check the database model.
4. Check existing components.
5. Explain what will be changed.
6. Implement only that phase.
7. Test it.
8. Review for regressions.
9. Update documentation.

---

## 95. DO NOT ASK UNNECESSARY QUESTIONS

If a decision is not critical, make a reasonable engineering decision.

For example:

Do not stop and ask:

> "Should this button be 8px or 10px?"

Choose a consistent design.

However, ask for clarification when a decision fundamentally changes:

- Product direction
- Data ownership
- Security
- Technology
- Architecture
- User experience

---

## 96. WHEN YOU FIND A PROBLEM

Do not hide it.

Explain:

```text
Problem
Cause
Impact
Recommended solution
Implementation
```

Then fix it if appropriate.

---

## 97. BEFORE WRITING CODE

Your first response/work cycle should produce:

## 1. Repository assessment

What exists now?

## 2. Product architecture

How should the system work?

## 3. MVP definition

What should be built first?

## 4. Database design

What data must exist?

## 5. Screen map

What screens are needed?

## 6. User flows

How does the user move through the application?

## 7. Implementation phases

What should be built first, second, third, etc.?

## 8. Risks

What technical/product risks exist?

Only after this planning stage should implementation begin.

---

## 98. FINAL PRODUCT EXPERIENCE

The finished application should allow a user to do something like this:

```text
Create account
      ↓
Create Family
      ↓
Add yourself
      ↓
Add parents
      ↓
Add grandparents
      ↓
Add siblings
      ↓
Add spouse
      ↓
Add children
      ↓
Explore Family Tree
      ↓
Open Grandfather's Profile
      ↓
Read his story
      ↓
View his photos
      ↓
Listen to his recorded memories
      ↓
See where he lived
      ↓
See important events
      ↓
Discover relationship to another relative
      ↓
Invite family members
      ↓
Build the family archive together
```

The result should feel like:

> **"I can finally see my family as a story."**

---

## 99. SUCCESS CRITERIA

The product is successful when a new user can:

1. Create an account.
2. Create a family.
3. Add themselves.
4. Add relatives.
5. Connect relationships.
6. See those relationships visually.
7. Open a person's profile.
8. Add a family story.
9. Upload a family photo.
10. Invite another relative.
11. Control who can see family information.
12. Search their family history.
13. Navigate multiple generations without confusion.

The application should be technically sound underneath while remaining extremely simple on the surface.

---

## 100. YOUR FIRST TASK

Do NOT start by building all features.

First:

### A. Inspect the repository.

### B. Determine the current stack.

### C. Determine what already exists.

### D. Create:

```text
docs/PRODUCT_PLAN.md
docs/ARCHITECTURE.md
docs/DATABASE.md
docs/UI_UX.md
docs/API.md
docs/SECURITY.md
docs/TESTING.md
docs/ROADMAP.md
```

### E. Define the MVP.

### F. Design the database.

### G. Design the navigation and screens.

### H. Identify technical risks.

### I. Present the implementation plan.

### J. Then begin implementing Phase 1.

Do not build the entire application in one uncontrolled operation.

Build it incrementally, test each phase, and keep the project maintainable.

---

## FINAL PRINCIPLE

The most important principle is:

**Build a family-history product that families can actually use for decades, not merely a visually impressive family-tree demo.**

The family tree is the foundation.

The people are the structure.

The stories, memories, photos, events, places, and documents are the history.

The collaboration system allows the family to preserve that history together.

Privacy protects it.

The final product should make that entire experience feel simple.
