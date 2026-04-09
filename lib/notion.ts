import { Client } from "@notionhq/client";

// Notion client singleton
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// Database IDs from environment
export const DB = {
  DB01_RESOURCE: process.env.NOTION_DB01_RESOURCE!,
  DB02_PERFORMANCE: process.env.NOTION_DB02_PERFORMANCE!,
  DB03_PROGRESS: process.env.NOTION_DB03_PROGRESS!,
  DB04_COLLABORATION: process.env.NOTION_DB04_COLLABORATION!,
  DB05_REGISTRATION: process.env.NOTION_DB05_REGISTRATION!,
  DB06_TRANSACTION: process.env.NOTION_DB06_TRANSACTION!,
  DB07_INVENTORY: process.env.NOTION_DB07_INVENTORY!,
  DB08_RELATIONSHIP: process.env.NOTION_DB08_RELATIONSHIP!,
  DB09_DATE_RANGE: process.env.NOTION_DB09_DATE_RANGE!,
} as const;

// Query a Notion database with optional filter and sorts
// Note: In @notionhq/client v5, query moved from databases to dataSources
export async function queryDatabase(
  databaseId: string,
  filter?: object,
  sorts?: object[],
  pageSize: number = 100
) {
  const response = await notion.dataSources.query({
    data_source_id: databaseId,
    filter: filter as any,
    sorts: sorts as any,
    page_size: pageSize,
  });
  return response.results;
}

// Get a single page by ID
export async function getPage(pageId: string) {
  return notion.pages.retrieve({ page_id: pageId });
}

// Create a page in a database
export async function createPage(
  databaseId: string,
  properties: Record<string, any>
) {
  return notion.pages.create({
    parent: { database_id: databaseId },
    properties,
  });
}

// Update a page's properties
export async function updatePage(
  pageId: string,
  properties: Record<string, any>
) {
  return notion.pages.update({
    page_id: pageId,
    properties,
  });
}

// Helper: extract plain text from a Notion rich_text property
export function extractText(richText: any[]): string {
  if (!richText || !Array.isArray(richText)) return "";
  return richText.map((t) => t.plain_text).join("");
}

// Helper: extract title from a Notion title property
export function extractTitle(titleProp: any[]): string {
  return extractText(titleProp);
}

// Helper: extract select value
export function extractSelect(selectProp: any): string | null {
  return selectProp?.name ?? null;
}

// Helper: extract multi-select values
export function extractMultiSelect(multiSelectProp: any[]): string[] {
  if (!multiSelectProp || !Array.isArray(multiSelectProp)) return [];
  return multiSelectProp.map((item) => item.name);
}

// Helper: extract date
export function extractDate(dateProp: any): {
  start: string | null;
  end: string | null;
} {
  if (!dateProp) return { start: null, end: null };
  return { start: dateProp.start, end: dateProp.end };
}

// Helper: extract relation IDs
export function extractRelation(relationProp: any[]): string[] {
  if (!relationProp || !Array.isArray(relationProp)) return [];
  return relationProp.map((item) => item.id);
}

// Helper: extract number
export function extractNumber(numberProp: any): number | null {
  return numberProp ?? null;
}

// Helper: extract checkbox
export function extractCheckbox(checkboxProp: any): boolean {
  return checkboxProp ?? false;
}

// Helper: extract URL
export function extractUrl(urlProp: any): string | null {
  return urlProp ?? null;
}

// Helper: extract status
export function extractStatus(statusProp: any): string | null {
  return statusProp?.name ?? null;
}

export default notion;
