# Requirements Document

## Introduction

CareerPath is a single-page responsive scholarship finder website that loads scholarship data from a local JSON file and presents it in a filterable, searchable interface. The site includes a visual Eligibility Gap Analyzer that compares a student's profile against each scholarship and highlights qualification gaps.

## Glossary

- **CareerPath**: The scholarship finder web application.
- **Scholarship_Card**: A visual card component displaying key details of one scholarship.
- **Scholarship_Grid**: The container that renders all visible Scholarship_Cards.
- **Search_Bar**: The text input used to filter scholarships by name, provider, or country.
- **Filter_Panel**: The UI controls for filtering by degree level, country, and minimum CGPA.
- **Eligibility_Analyzer**: The tool that accepts a student profile and evaluates eligibility against each scholarship.
- **Gap_Report**: The result section of the Eligibility_Analyzer listing qualified, unqualified, and gap scholarships.
- **Deadline_Badge**: The red "Closing Soon" label shown on a card when the deadline is within 60 days.
- **Student_Profile**: The combination of CGPA, degree level, province, country preference, field of study, and financial need entered by a student in the Eligibility_Analyzer.
- **Funding_Type**: Full or partial funding classification of a scholarship.
- **Status_Badge**: A coloured label on a card reflecting the scholarship's current application status.

---

## Requirements

### Requirement 1: Data Loading

**User Story:** As a developer, I want the application to load scholarship data from a local JSON file, so that the scholarship list is easy to maintain without changing application code.

#### Acceptance Criteria

1. WHEN the page loads, THE CareerPath SHALL fetch scholarship data from `./scholarships.json` using the Fetch API.
2. WHEN the fetch request succeeds, THE CareerPath SHALL render all scholarships in the Scholarship_Grid.
3. IF the fetch request fails, THEN THE CareerPath SHALL display a visible error message explaining that the data could not be loaded.
4. THE CareerPath SHALL parse each scholarship record with the fields: `name`, `country`, `provider`, `degree`, `minCGPA`, `deadline`, `funding`, `link`, `status`, `type`, `province`, and `requirements`.

---

### Requirement 2: Scholarship Card Display

**User Story:** As a student, I want to see scholarship details at a glance, so that I can quickly assess which opportunities are relevant to me.

#### Acceptance Criteria

1. THE Scholarship_Card SHALL display the scholarship name, provider, country, degree level, minimum CGPA, deadline, funding description, status, and requirements.
2. THE Scholarship_Card SHALL include an "Apply Now" button that opens the scholarship's `link` value in a new browser tab.
3. WHEN a scholarship's deadline is within 60 calendar days from today and the deadline is a parseable date, THE Scholarship_Card SHALL display a Deadline_Badge labelled "Closing Soon" with a red (#E74C3C) background.
4. THE Scholarship_Card SHALL use a white card background with a visible drop shadow to separate it from the page background.
5. THE Status_Badge on each Scholarship_Card SHALL reflect the scholarship's `status` field value.

---

### Requirement 3: Search

**User Story:** As a student, I want to search scholarships by keyword, so that I can quickly find scholarships matching a specific name, provider, or destination country.

#### Acceptance Criteria

1. THE Search_Bar SHALL accept free-text input and filter the Scholarship_Grid in real time as the user types.
2. WHEN the search query matches part of a scholarship's `name`, `provider`, or `country` (case-insensitive), THE Scholarship_Grid SHALL include that scholarship's card.
3. WHEN no scholarships match the search query, THE Scholarship_Grid SHALL display a "No scholarships found" message.
4. WHEN the search input is cleared, THE Scholarship_Grid SHALL restore all scholarships subject to any active Filter_Panel selections.

---

### Requirement 4: Filters

**User Story:** As a student, I want to filter scholarships by degree level, country, and CGPA requirement, so that I only see scholarships I could potentially qualify for.

#### Acceptance Criteria

1. THE Filter_Panel SHALL provide a degree-level dropdown with options derived from the unique `degree` values present in the loaded data plus an "All Degrees" default option.
2. THE Filter_Panel SHALL provide a country dropdown with options derived from the unique `country` values present in the loaded data plus an "All Countries" default option.
3. THE Filter_Panel SHALL provide a minimum CGPA numeric input that hides scholarships whose `minCGPA` exceeds the entered value.
4. WHEN the user changes any Filter_Panel control, THE Scholarship_Grid SHALL update immediately to show only scholarships satisfying all active filter conditions simultaneously.
5. WHEN a filter is reset to its default value, THE Scholarship_Grid SHALL restore scholarships that were previously hidden by that filter, subject to other active filters.

---

### Requirement 5: Eligibility Gap Analyzer

**User Story:** As a student, I want to enter my academic profile and see which scholarships I qualify for and where I fall short, so that I can plan improvements to become eligible for more scholarships.

#### Acceptance Criteria

1. THE Eligibility_Analyzer SHALL accept the following Student_Profile inputs: CGPA (numeric 0–4), degree level (dropdown), province (text or dropdown), country preference (dropdown), field of study (text input), and financial need (checkbox or toggle).
2. WHEN the student submits the Student_Profile, THE Eligibility_Analyzer SHALL evaluate every loaded scholarship and categorise each as "Qualified", "Not Qualified", or "Close Match".
3. WHEN a scholarship's `minCGPA` is greater than the student's CGPA, THE Gap_Report SHALL display the gap as "Your CGPA is X, this scholarship requires Y — gap of Z" where Z = Y − X rounded to one decimal place.
4. WHEN a scholarship's `degree` field does not include the student's degree level, THE Gap_Report SHALL indicate the degree mismatch.
5. THE Gap_Report SHALL organise results into three labelled sections: "You Qualify", "Close Match" (CGPA gap ≤ 0.5), and "Not Eligible" (CGPA gap > 0.5 or degree mismatch).
6. WHEN no Student_Profile has been submitted, THE Eligibility_Analyzer SHALL display an instructional prompt encouraging the student to enter their details.

---

### Requirement 6: Deadline Urgency

**User Story:** As a student, I want upcoming deadlines to be visually highlighted, so that I do not miss scholarship application windows.

#### Acceptance Criteria

1. WHEN calculating deadline urgency, THE CareerPath SHALL attempt to parse each scholarship's `deadline` field as a date.
2. WHEN the parsed deadline falls within 60 calendar days of the current date, THE Scholarship_Card SHALL display the Deadline_Badge.
3. WHEN the `deadline` field contains a range (e.g. "Oct-Nov 2026"), a rolling entry (e.g. "Rolling 2026"), or any unparseable value, THE Scholarship_Card SHALL NOT display the Deadline_Badge for that scholarship.

---

### Requirement 7: Responsive Layout

**User Story:** As a student using a mobile device, I want the website to be fully usable on small screens, so that I can browse scholarships on my phone.

#### Acceptance Criteria

1. THE CareerPath SHALL use a CSS grid or flexbox layout that displays multiple Scholarship_Cards per row on desktop screens (viewport width ≥ 1024 px) and a single column on mobile screens (viewport width < 640 px).
2. THE Filter_Panel SHALL stack vertically on mobile screens and display inline on desktop screens.
3. THE Eligibility_Analyzer form SHALL be fully usable on a 360 px wide viewport without horizontal scrolling.
4. THE CareerPath SHALL use a viewport meta tag to enable correct scaling on mobile devices.

---

### Requirement 8: Visual Design

**User Story:** As a student, I want the website to look professional and trustworthy, so that I feel confident using it to find opportunities.

#### Acceptance Criteria

1. THE CareerPath header SHALL use the deep blue colour #1B3A4B as its background colour.
2. THE CareerPath header SHALL display the site name "CareerPath" and the tagline "Find Your Scholarship. Build Your Future."
3. THE Deadline_Badge SHALL use the red colour #E74C3C as its background colour.
4. THE CareerPath SHALL use a single `index.html` file containing all HTML, CSS (in a `<style>` tag), and JavaScript (in a `<script>` tag).
5. THE CareerPath SHALL render correctly in the latest versions of Chrome, Firefox, and Safari.
