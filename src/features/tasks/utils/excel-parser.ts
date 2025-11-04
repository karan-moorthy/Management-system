import * as XLSX from 'xlsx';
import { TaskStatus, TaskPriority, TaskImportance, type ExcelTaskData } from '../types';

export function parseExcelFile(buffer: Buffer): ExcelTaskData[] {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert sheet to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length < 2) {
      throw new Error('Excel file must have at least a header row and one data row');
    }
    
    const headers = jsonData[0] as string[];
    const rows = jsonData.slice(1) as any[][];
    
    // Expected columns (case-insensitive matching)
    const columnMap = mapColumnsToProperties(headers);
    
    const tasks: ExcelTaskData[] = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (isEmptyRow(row)) continue;
      
      try {
        const task = parseRowToTask(row, columnMap, i + 2); // +2 for header and 1-based indexing
        tasks.push(task);
      } catch (error) {
        console.warn(`Skipping row ${i + 2}: ${error}`);
      }
    }
    
    return tasks;
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error}`);
  }
}

function mapColumnsToProperties(headers: string[]): Record<string, number> {
  const columnMap: Record<string, number> = {};
  
  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();
    
    // Map common column names
    if (normalizedHeader.includes('task') || normalizedHeader.includes('name') || normalizedHeader.includes('title')) {
      columnMap.name = index;
    } else if (normalizedHeader.includes('description') || normalizedHeader.includes('detail')) {
      columnMap.description = index;
    } else if (normalizedHeader.includes('status') || normalizedHeader.includes('state')) {
      columnMap.status = index;
    } else if (normalizedHeader.includes('priority')) {
      columnMap.priority = index;
    } else if (normalizedHeader.includes('importance') || normalizedHeader.includes('urgency')) {
      columnMap.importance = index;
    } else if (normalizedHeader.includes('due') || normalizedHeader.includes('date') || normalizedHeader.includes('deadline')) {
      columnMap.dueDate = index;
    } else if (normalizedHeader.includes('category') || normalizedHeader.includes('type')) {
      columnMap.category = index;
    } else if (normalizedHeader.includes('estimated') || normalizedHeader.includes('estimate')) {
      columnMap.estimatedHours = index;
    } else if (normalizedHeader.includes('assignee') || normalizedHeader.includes('assigned') || normalizedHeader.includes('email')) {
      columnMap.assigneeEmail = index;
    } else if (normalizedHeader.includes('tag') || normalizedHeader.includes('label')) {
      columnMap.tags = index;
    }
  });
  
  return columnMap;
}

function parseRowToTask(row: any[], columnMap: Record<string, number>, rowNumber: number): ExcelTaskData {
  const getValue = (property: string): any => {
    const columnIndex = columnMap[property];
    return columnIndex !== undefined ? row[columnIndex] : undefined;
  };
  
  // Required fields
  const name = getValue('name');
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new Error(`Task name is required (row ${rowNumber})`);
  }
  
  // Parse status
  const statusValue = getValue('status') || 'TODO';
  const status = parseEnumValue(statusValue, TaskStatus, 'TODO') as TaskStatus;
  
  // Parse priority
  const priorityValue = getValue('priority') || 'MEDIUM';
  const priority = parseEnumValue(priorityValue, TaskPriority, 'MEDIUM') as TaskPriority;
  
  // Parse importance
  const importanceValue = getValue('importance') || 'MEDIUM';
  const importance = parseEnumValue(importanceValue, TaskImportance, 'MEDIUM') as TaskImportance;
  
  // Parse due date
  const dueDateValue = getValue('dueDate');
  let dueDate: string;
  
  if (dueDateValue) {
    if (typeof dueDateValue === 'number') {
      // Excel date number
      const excelDate = XLSX.SSF.parse_date_code(dueDateValue);
      dueDate = new Date(excelDate.y, excelDate.m - 1, excelDate.d).toISOString();
    } else if (dueDateValue instanceof Date) {
      dueDate = dueDateValue.toISOString();
    } else if (typeof dueDateValue === 'string') {
      const parsedDate = new Date(dueDateValue);
      if (isNaN(parsedDate.getTime())) {
        dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Default to 7 days from now
      } else {
        dueDate = parsedDate.toISOString();
      }
    } else {
      dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }
  } else {
    dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  
  // Parse optional fields
  const description = getValue('description') || undefined;
  const category = getValue('category') || undefined;
  const estimatedHours = parseNumber(getValue('estimatedHours'));
  const assigneeEmail = getValue('assigneeEmail') || undefined;
  
  // Parse tags
  const tagsValue = getValue('tags');
  let tags: string[] | undefined;
  if (tagsValue) {
    if (typeof tagsValue === 'string') {
      tags = tagsValue.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    } else if (Array.isArray(tagsValue)) {
      tags = tagsValue.map(tag => String(tag).trim()).filter(tag => tag.length > 0);
    }
  }
  
  return {
    name: name.trim(),
    description,
    status,
    priority,
    importance,
    dueDate,
    category,
    estimatedHours,
    assigneeEmail,
    tags: tags && tags.length > 0 ? tags : undefined,
  };
}

function parseEnumValue<T extends Record<string, string>>(
  value: any,
  enumObj: T,
  defaultValue: string
): string {
  if (!value) return defaultValue;
  
  const stringValue = String(value).toUpperCase().trim();
  const enumValues = Object.values(enumObj);
  
  // Direct match
  if (enumValues.includes(stringValue as any)) {
    return stringValue;
  }
  
  // Fuzzy match for common variations
  const fuzzyMatches: Record<string, string> = {
    'P1': 'CRITICAL',
    'P2': 'HIGH', 
    'P3': 'MEDIUM',
    'P4': 'LOW',
    'URGENT': 'CRITICAL',
    'NORMAL': 'MEDIUM',
    'MINOR': 'LOW',
    'MAJOR': 'HIGH',
    'BLOCKER': 'CRITICAL',
    'TRIVIAL': 'LOW',
    'IN PROGRESS': 'IN_PROGRESS',
    'INPROGRESS': 'IN_PROGRESS',
    'IN REVIEW': 'IN_REVIEW',
    'INREVIEW': 'IN_REVIEW',
    'COMPLETE': 'DONE',
    'COMPLETED': 'DONE',
    'FINISHED': 'DONE',
    'PENDING': 'TODO',
    'NEW': 'TODO',
    'OPEN': 'TODO',
  };
  
  const fuzzyMatch = fuzzyMatches[stringValue];
  if (fuzzyMatch && enumValues.includes(fuzzyMatch as any)) {
    return fuzzyMatch;
  }
  
  return defaultValue;
}

function parseNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  
  const num = Number(value);
  return isNaN(num) ? undefined : num;
}

function isEmptyRow(row: any[]): boolean {
  return row.every(cell => cell === null || cell === undefined || cell === '');
}