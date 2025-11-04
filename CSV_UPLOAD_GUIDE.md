# CSV Upload Feature - User Guide

## 📊 CSV Upload for Bulk Task Import

Your application now supports bulk task import via CSV files with the exact structure from your Excel sheet.

### ✅ Features Implemented

1. **CSV Upload Only**: System now only accepts CSV files to prevent binary corruption
2. **Smart Date Parsing**: Handles DD-MMM-YY format (e.g., "03-Oct-25")
3. **Assignee Matching**: Automatically assigns tasks to users by name
4. **Epic Categorization**: Uses Epic column as task category
5. **Proper Data Mapping**: Maps your Excel structure to database fields

### 📋 Expected CSV Format

Your CSV file should have these exact columns:

```
Epic,Story,Planned Start,Planned Completion,Responsibility
```

**Column Mapping:**
- **Epic** → Task Category
- **Story** → Task Name 
- **Planned Start** → Added to task description
- **Planned Completion** → Task Due Date
- **Responsibility** → Task Assignee

### 👥 Available Assignees

The system has these users available for task assignment:
- Arunraj
- Aishwarya  
- Chandramohan
- Vinoth
- Demo User (fallback)

### 🚀 How to Upload

1. **Prepare CSV**: Convert your Excel sheet to CSV format
   - File → Save As → CSV (Comma delimited)
   
2. **Access Upload**: Go to your dashboard and look for "Bulk Task Import" card

3. **Select Files**: 
   - Choose Workspace
   - Choose Project  
   - Upload CSV file (drag & drop or click to browse)

4. **Upload**: Click "Upload Tasks" button

### 📁 Sample CSV File

A sample CSV file `sample-project-tasks.csv` has been created in your project root with your exact data structure.

### ✨ What Happens After Upload

1. **Task Creation**: Each CSV row becomes a task in your database
2. **Board Display**: Tasks appear in Board view under "To Do" column
3. **Dashboard Analytics**: Home page calculations include imported tasks
4. **Project Management**: Tasks are linked to selected project and workspace

### 🔍 Data Verification

After upload, you can:
- Check Board view for Kanban display
- View tasks in project lists
- See updated analytics on dashboard
- Edit individual tasks as needed

### 🎯 Next Steps

1. **Test Upload**: Use the sample CSV file to test the functionality
2. **Verify Data**: Check that tasks appear correctly in all views
3. **Production Use**: Upload your actual project data via CSV

The system is now ready for your bulk task import! All corrupted data issues have been resolved and the upload process is optimized for your Excel structure.