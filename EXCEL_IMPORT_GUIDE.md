# Excel Task Import Template

This document explains the format for importing tasks via Excel files.

## Required Columns

Your Excel file should have the following columns (column names are case-insensitive):

### Column Definitions

| Column Name | Required | Description | Example Values |
|-------------|----------|-------------|----------------|
| **Task Name** | ✅ Yes | Name/title of the task | "Implement user authentication", "Fix login bug" |
| **Description** | ❌ No | Detailed task description | "Create login form with email/password validation" |
| **Status** | ❌ No | Current task status | TODO, IN_PROGRESS, IN_REVIEW, DONE, BACKLOG |
| **Priority** | ❌ No | Task priority level | LOW, MEDIUM, HIGH, CRITICAL |
| **Importance** | ❌ No | Task importance level | LOW, MEDIUM, HIGH, CRITICAL |
| **Due Date** | ❌ No | Task deadline | 2025-12-31, 31/12/2025, Dec 31, 2025 |
| **Category** | ❌ No | Task category/type | Bug, Feature, Enhancement, Documentation |
| **Estimated Hours** | ❌ No | Estimated time to complete | 2, 4.5, 8 |
| **Assignee Email** | ❌ No | Email of assigned person | user@example.com |
| **Tags** | ❌ No | Comma-separated tags | "frontend, ui, urgent" |

## Sample Data

Here's an example of what your Excel file should look like:

| Task Name | Description | Status | Priority | Importance | Due Date | Category | Estimated Hours | Assignee Email | Tags |
|-----------|-------------|---------|----------|------------|----------|----------|----------------|----------------|------|
| User Login System | Implement secure user authentication | TODO | HIGH | HIGH | 2025-12-15 | Feature | 8 | dev@example.com | auth, security |
| Fix Dashboard Bug | Resolve data loading issue on dashboard | IN_PROGRESS | CRITICAL | HIGH | 2025-11-10 | Bug | 2 | qa@example.com | bug, urgent |
| Update Documentation | Revise API documentation for v2.0 | TODO | MEDIUM | MEDIUM | 2025-12-20 | Documentation | 4 | writer@example.com | docs |
| Performance Optimization | Optimize database queries for reports | BACKLOG | HIGH | MEDIUM | 2026-01-15 | Enhancement | 12 | senior@example.com | performance, db |

## Status Values
- **BACKLOG**: Not yet started, in backlog
- **TODO**: Ready to start
- **IN_PROGRESS**: Currently being worked on
- **IN_REVIEW**: Under review/testing
- **DONE**: Completed

## Priority & Importance Levels
- **LOW**: Not urgent, can be delayed
- **MEDIUM**: Normal priority/importance
- **HIGH**: Important, should be prioritized
- **CRITICAL**: Urgent, needs immediate attention

## Tips for Best Results

1. **Use the first row for headers** - The system will automatically detect column names
2. **Consistent formatting** - Try to use consistent date formats and status values
3. **One task per row** - Each row should represent one task
4. **Empty rows are ignored** - Don't worry about empty rows in your sheet
5. **Flexible column matching** - The system can handle variations in column names (e.g., "Task", "Name", "Title" all work for task name)

## Common Column Name Variations

The system automatically recognizes these variations:

- **Task Name**: Task, Name, Title, Task Name, Task Title
- **Description**: Description, Detail, Details, Notes
- **Status**: Status, State, Current Status
- **Priority**: Priority, Priority Level, Prio
- **Importance**: Importance, Urgency, Important
- **Due Date**: Due Date, Deadline, Date, Target Date
- **Category**: Category, Type, Task Type
- **Estimated Hours**: Estimated Hours, Estimate, Hours, Time
- **Assignee Email**: Assignee, Assigned To, Email, Assignee Email
- **Tags**: Tags, Labels, Keywords

## File Format Support

- ✅ Excel (.xlsx)
- ✅ Excel Legacy (.xls) 
- ✅ CSV files (.csv)
- 📋 Maximum file size: 10MB