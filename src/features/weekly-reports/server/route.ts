import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { sessionMiddleware } from '@/lib/session-middleware';
import { db } from '@/db';
import { weeklyReports, users, members, notifications } from '@/db/schema';
import { eq, and, gte, lte, desc, inArray } from 'drizzle-orm';
import { MemberRole } from '@/features/members/types';

const app = new Hono()
  // Create weekly report (Employee only)
  .post(
    '/',
    sessionMiddleware,
    zValidator('json', z.object({
      fromDate: z.string(),
      toDate: z.string(),
      department: z.string(),
      dailyDescriptions: z.record(z.string(), z.string()), // { "2025-11-25": "description" }
      uploadedFiles: z.array(z.object({
        date: z.string(),
        fileName: z.string(),
        fileUrl: z.string(),
        fileSize: z.number(),
        uploadedAt: z.string(),
      })).optional().default([]),
      isDraft: z.boolean().optional().default(false),
    })),
    async (c) => {
      const user = c.get('user');

      // Check if user is employee (can be employee even if they have other roles)
      const memberRecords = await db
        .select()
        .from(members)
        .where(eq(members.userId, user.id));

      const isEmployee = memberRecords.some(m => m.role === MemberRole.EMPLOYEE);
      
      console.log('[Weekly Report Draft] User:', user.id, 'Has Employee role:', isEmployee, 'Member records:', memberRecords.length);

      if (!isEmployee) {
        console.log('[Weekly Report Draft] Access denied - user is not an employee');
        return c.json({ error: 'Only employees can submit weekly reports' }, 403);
      }

      const { fromDate, toDate, department, dailyDescriptions, uploadedFiles, isDraft } = c.req.valid('json');

      console.log('[Weekly Report Draft] Creating report:', {
        userId: user.id,
        isDraft,
        fromDate,
        toDate,
        department,
        dailyDescCount: Object.keys(dailyDescriptions).length
      });

      try {
        // Create the weekly report (draft or final)
        const [report] = await db.insert(weeklyReports).values({
          userId: user.id,
          department,
          fromDate: new Date(fromDate),
          toDate: new Date(toDate),
          dailyDescriptions,
          uploadedFiles: uploadedFiles || [],
          status: isDraft ? 'draft' : 'submitted',
          isDraft: isDraft ? 'true' : 'false',
        }).returning();

        console.log('[Weekly Report Draft] Report created successfully:', report.id, 'isDraft:', report.isDraft);

        // If report is submitted (not a draft), notify all admins and managers
        if (!isDraft) {
          console.log('[Weekly Report] Report submitted, notifying admins...');
          
          // Get employee details
          const [employee] = await db
            .select()
            .from(users)
            .where(eq(users.id, user.id));

          console.log('[Weekly Report] Employee:', employee?.name, employee?.id);

          // Get all workspace IDs for this user
          const userWorkspaces = await db
            .select({ workspaceId: members.workspaceId })
            .from(members)
            .where(eq(members.userId, user.id));

          const workspaceIds = userWorkspaces.map(w => w.workspaceId);
          console.log('[Weekly Report] User workspaces:', workspaceIds.length);

          if (workspaceIds.length > 0) {
            // Get all admins and managers from user's workspaces
            const adminMembers = await db
              .select({
                userId: members.userId,
                workspaceId: members.workspaceId,
                role: members.role,
              })
              .from(members)
              .where(
                and(
                  inArray(members.workspaceId, workspaceIds),
                  inArray(members.role, [MemberRole.ADMIN, MemberRole.PROJECT_MANAGER])
                )
              );

            console.log('[Weekly Report] Found', adminMembers.length, 'admins/managers:', 
              adminMembers.map(a => ({ userId: a.userId, role: a.role })));

            // Create notifications for all admins/managers
            if (adminMembers.length > 0) {
              const employeeName = employee?.name || 'An employee';
              const dateRange = `${new Date(fromDate).toLocaleDateString()} - ${new Date(toDate).toLocaleDateString()}`;
              
              const notificationValues = adminMembers.map(admin => ({
                userId: admin.userId,
                type: 'WEEKLY_REPORT_SUBMITTED',
                title: 'New Weekly Report Submitted',
                message: `${employeeName} submitted a weekly report for ${dateRange}`,
                actionBy: user.id,
                actionByName: employeeName,
                isRead: 'false',
              }));

              console.log('[Weekly Report] Creating notifications:', notificationValues);

              const createdNotifications = await db
                .insert(notifications)
                .values(notificationValues)
                .returning();

              console.log('[Weekly Report] Created', createdNotifications.length, 'notifications successfully');
            } else {
              console.log('[Weekly Report] No admins/managers found to notify');
            }
          } else {
            console.log('[Weekly Report] User has no workspaces');
          }
        }

        return c.json({ 
          data: report, 
          message: isDraft ? 'Draft saved successfully' : 'Weekly report submitted successfully' 
        });
      } catch (error) {
        console.error('[Weekly Report Draft] Error submitting weekly report:', error);
        return c.json({ error: 'Failed to submit weekly report' }, 500);
      }
    }
  )
  
  // Update existing draft (PATCH endpoint)
  .patch(
    '/:id',
    sessionMiddleware,
    zValidator('json', z.object({
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
      department: z.string().optional(),
      dailyDescriptions: z.record(z.string(), z.string()).optional(),
      uploadedFiles: z.array(z.object({
        date: z.string(),
        fileName: z.string(),
        fileUrl: z.string(),
        fileSize: z.number(),
        uploadedAt: z.string(),
      })).optional(),
      isDraft: z.boolean().optional(),
    })),
    async (c) => {
      const user = c.get('user');
      const { id } = c.req.param();
      const updateData = c.req.valid('json');

      console.log('[Weekly Report Update] User:', user.id, 'Updating report:', id, 'isDraft:', updateData.isDraft);

      try {
        // Check if report exists and belongs to user
        const [existingReport] = await db
          .select()
          .from(weeklyReports)
          .where(and(
            eq(weeklyReports.id, id),
            eq(weeklyReports.userId, user.id)
          ))
          .limit(1);

        if (!existingReport) {
          console.log('[Weekly Report Update] Report not found or access denied');
          return c.json({ error: 'Report not found or access denied' }, 404);
        }

        console.log('[Weekly Report Update] Existing report found, current isDraft:', existingReport.isDraft);

        // Build update object
        const updates: any = {
          updatedAt: new Date(),
        };

        if (updateData.fromDate) updates.fromDate = new Date(updateData.fromDate);
        if (updateData.toDate) updates.toDate = new Date(updateData.toDate);
        if (updateData.department) updates.department = updateData.department;
        if (updateData.dailyDescriptions) updates.dailyDescriptions = updateData.dailyDescriptions;
        if (updateData.uploadedFiles) updates.uploadedFiles = updateData.uploadedFiles;
        
        if (updateData.isDraft !== undefined) {
          updates.isDraft = updateData.isDraft ? 'true' : 'false';
          updates.status = updateData.isDraft ? 'draft' : 'submitted';
        }

        console.log('[Weekly Report Update] Updating with:', updates);

        // Update the report
        const [updatedReport] = await db
          .update(weeklyReports)
          .set(updates)
          .where(eq(weeklyReports.id, id))
          .returning();

        console.log('[Weekly Report Update] Report updated successfully, new isDraft:', updatedReport.isDraft);

        return c.json({ 
          data: updatedReport, 
          message: updateData.isDraft === false ? 'Weekly report submitted successfully' : 'Draft updated successfully'
        });
      } catch (error) {
        console.error('[Weekly Report Update] Error updating weekly report:', error);
        return c.json({ error: 'Failed to update weekly report' }, 500);
      }
    }
  )
  
  // Get weekly reports (Admin only - for download page)
  .get(
    '/',
    sessionMiddleware,
    zValidator('query', z.object({
      department: z.string().optional(),
      userId: z.string().optional(),
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
      limit: z.string().optional(),
      offset: z.string().optional(),
    })),
    async (c) => {
      const user = c.get('user');
      const { department, userId, fromDate, toDate, limit = "50", offset = "0" } = c.req.valid('query');

      // Check if user is admin
      const memberRecords = await db
        .select()
        .from(members)
        .where(eq(members.userId, user.id));

      const isAdmin = memberRecords.some(m => 
        m.role === MemberRole.ADMIN || 
        m.role === MemberRole.PROJECT_MANAGER || 
        m.role === MemberRole.MANAGEMENT
      );

      if (!isAdmin) {
        return c.json({ error: 'Only admins can view all weekly reports' }, 403);
      }

      try {
        // Build query conditions
        const conditions: any[] = [
          eq(weeklyReports.isDraft, 'false') // Only show submitted reports to admin
        ];

        if (department) {
          conditions.push(eq(weeklyReports.department, department));
        }
        if (userId) {
          conditions.push(eq(weeklyReports.userId, userId));
        }
        if (fromDate) {
          conditions.push(gte(weeklyReports.fromDate, new Date(fromDate)));
        }
        if (toDate) {
          conditions.push(lte(weeklyReports.toDate, new Date(toDate)));
        }

        const reports = await db
          .select({
            id: weeklyReports.id,
            userId: weeklyReports.userId,
            fromDate: weeklyReports.fromDate,
            toDate: weeklyReports.toDate,
            department: weeklyReports.department,
            dailyDescriptions: weeklyReports.dailyDescriptions,
            uploadedFiles: weeklyReports.uploadedFiles,
            status: weeklyReports.status,
            createdAt: weeklyReports.createdAt,
            updatedAt: weeklyReports.updatedAt,
            employeeName: users.name,
            employeeEmail: users.email,
          })
          .from(weeklyReports)
          .leftJoin(users, eq(weeklyReports.userId, users.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(weeklyReports.createdAt))
          .limit(parseInt(limit))
          .offset(parseInt(offset));

        return c.json({ data: reports });
      } catch (error) {
        console.error('Error fetching weekly reports:', error);
        return c.json({ error: 'Failed to fetch weekly reports' }, 500);
      }
    }
  )
  
  // Get employee's own weekly reports
  .get(
    '/my-reports',
    sessionMiddleware,
    async (c) => {
      const user = c.get('user');

      try {
        const reports = await db
          .select()
          .from(weeklyReports)
          .where(eq(weeklyReports.userId, user.id))
          .orderBy(desc(weeklyReports.createdAt));

        return c.json({ data: reports });
      } catch (error) {
        console.error('Error fetching employee reports:', error);
        return c.json({ error: 'Failed to fetch reports' }, 500);
      }
    }
  )
  
  // Get single weekly report by ID
  .get(
    '/:id',
    sessionMiddleware,
    async (c) => {
      const user = c.get('user');
      const { id } = c.req.param();

      try {
        const [report] = await db
          .select({
            id: weeklyReports.id,
            userId: weeklyReports.userId,
            fromDate: weeklyReports.fromDate,
            toDate: weeklyReports.toDate,
            department: weeklyReports.department,
            dailyDescriptions: weeklyReports.dailyDescriptions,
            uploadedFiles: weeklyReports.uploadedFiles,
            status: weeklyReports.status,
            createdAt: weeklyReports.createdAt,
            updatedAt: weeklyReports.updatedAt,
            employeeName: users.name,
            employeeEmail: users.email,
          })
          .from(weeklyReports)
          .leftJoin(users, eq(weeklyReports.userId, users.id))
          .where(eq(weeklyReports.id, id))
          .limit(1);

        if (!report) {
          return c.json({ error: 'Report not found' }, 404);
        }

        // Check permissions
        const memberRecords = await db
          .select()
          .from(members)
          .where(eq(members.userId, user.id));

        const isAdmin = memberRecords.some(m => 
          m.role === MemberRole.ADMIN || 
          m.role === MemberRole.PROJECT_MANAGER || 
          m.role === MemberRole.MANAGEMENT
        );

        if (!isAdmin && report.userId !== user.id) {
          return c.json({ error: 'Forbidden' }, 403);
        }

        return c.json({ data: report });
      } catch (error) {
        console.error('Error fetching weekly report:', error);
        return c.json({ error: 'Failed to fetch weekly report' }, 500);
      }
    }
  );

export default app;
