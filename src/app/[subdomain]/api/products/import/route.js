import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, ROLES } from "@/lib/auth";

export async function POST(req) {
  try {
    const user = await requireUser();

    // Require OWNER or MANAGER role for bulk imports
    const roleError = requireRole(user, [ROLES.OWNER, ROLES.MANAGER]);
    if (roleError) return roleError;

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Read and parse CSV content
    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      return NextResponse.json(
        { error: "CSV must have header row and at least one data row" },
        { status: 400 }
      );
    }

    // Parse header and create mapping
    const rawHeaders = rows[0];
    const headerMapObj = createHeaderMap(rawHeaders);
    const requiredHeaders = ["name", "salePrice"];
    const missingHeaders = requiredHeaders.filter((h) => !headerMapObj[h]);

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required columns: ${missingHeaders.join(", ")}. Found: ${rawHeaders.join(", ")}`,
        },
        { status: 400 }
      );
    }


    // Get default location
    const defaultLocation = await prisma.location.findFirst({
      where: { 
        tenantId: user.tenantId,
        ...(user.locationId ? { id: user.locationId } : {})
      },
      select: { id: true },
    });

    if (!defaultLocation) {
      return NextResponse.json(
        { error: "No location configured for tenant" },
        { status: 400 }
      );
    }

    // Process rows
    const results = {
      success: [],
      errors: [],
      skipped: 0,
    };

    for (let i = 1; i < rows.length; i++) {
      try {
        const values = rows[i];
        const row = mapRowToColumns(headerMapObj, values);

        // Skip empty rows or rows missing required name
        if (!row.name) {
          results.skipped++;
          continue;
        }

        // Clean prices
        const salePrice = cleanNumber(row.salePrice);
        const costPrice = cleanNumber(row.costPrice || "0");

        if (salePrice === null || isNaN(Number(salePrice))) {
          results.errors.push({
            row: i + 1,
            error: `Invalid sale price: "${row.salePrice}"`,
          });
          continue;
        }

        // Check if SKU already exists (if provided)
        if (row.sku) {
          const existing = await prisma.product.findFirst({
            where: { tenantId: user.tenantId, sku: row.sku },
          });
          if (existing) {
            results.errors.push({
              row: i + 1,
              error: `SKU "${row.sku}" already exists`,
            });
            continue;
          }
        }

        // Check if barcode already exists (if provided)
        if (row.barcode) {
          const existing = await prisma.product.findUnique({
            where: { barcode: row.barcode },
          });
          if (existing) {
            results.errors.push({
              row: i + 1,
              error: `Barcode "${row.barcode}" already exists`,
            });
            continue;
          }
        }

        // Create product with initial stock in transaction
        const product = await prisma.$transaction(async (tx) => {
          const newProduct = await tx.product.create({
            data: {
              tenantId: user.tenantId,
              name: row.name,
              sku: row.sku || null,
              barcode: row.barcode || null,
              description: row.description || null,
              categoryId: row.categoryId || null,
              supplierId: row.supplierId || null,
              costPrice: Number(costPrice),
              salePrice: Number(salePrice),
              trackStock: row.trackStock !== "false",
              lowStockAlert: row.lowStockAlert ? Number(row.lowStockAlert) : null,
              unit: row.unit || "unit",
              metadata: row.metadata ? JSON.parse(row.metadata) : {},
            },
          });

          // Create initial stock if provided
          const initialStock = cleanNumber(row.initialStock);
          if (initialStock !== null) {
            const qty = Number(initialStock);
            await tx.stock.create({
              data: {
                productId: newProduct.id,
                locationId: defaultLocation.id,
                quantity: qty,
                minQuantity: row.lowStockAlert ? Number(cleanNumber(row.lowStockAlert) || 0) : 0,
              },
            });

            if (qty > 0) {
              await tx.stockMovement.create({
                data: {
                  tenantId: user.tenantId,
                  productId: newProduct.id,
                  locationId: defaultLocation.id,
                  type: "PURCHASE",
                  quantity: qty,
                  reference: `BULK_IMPORT_${i}`,
                  notes: "Bulk import initial stock",
                  createdBy: user.id,
                },
              });
            }
          }

          return newProduct;
        });

        results.success.push({
          row: i + 1,
          productId: product.id,
          name: product.name,
          sku: product.sku,
        });
      } catch (error) {
        results.errors.push({
          row: i + 1,
          error: error.message || "Failed to create product",
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Import completed: ${results.success.length} created, ${results.errors.length} errors, ${results.skipped} skipped`,
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Bulk import error:", error);
    return NextResponse.json(
      { error: "Failed to process import" },
      { status: 500 }
    );
  }
}

/**
 * Robust CSV parser that handles quoted values and newlines within quotes
 */
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      // Handle line breaks
      if (char === "\r" && nextChar === "\n") i++;
      
      // Only push if we have data or it's not the very end of the file
      if (currentRow.length > 0 || currentField !== "") {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      }
    } else {
      currentField += char;
    }
  }

  // Push the last row if exists
  if (currentRow.length > 0 || currentField !== "") {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows;
}

const COLUMN_MAP = {
  "name": "name",
  "saleprice": "salePrice",
  "sale price": "salePrice",
  "sku": "sku",
  "barcode": "barcode",
  "costprice": "costPrice",
  "cost price": "costPrice",
  "initialstock": "initialStock",
  "initial stock": "initialStock",
  "lowstockalert": "lowStockAlert",
  "low stock alert": "lowStockAlert",
  "description": "description",
  "unit": "unit",
  "trackstock": "trackStock",
  "track stock": "trackStock",
  "categoryid": "categoryId",
  "supplierid": "supplierId",
};

/**
 * Creates a map of original header index to standardized camelCase column name
 */
function createHeaderMap(headers) {
  const map = {};
  headers.forEach((header, index) => {
    const cleanHeader = header.toLowerCase().trim();
    if (COLUMN_MAP[cleanHeader]) {
      map[COLUMN_MAP[cleanHeader]] = index;
    } else {
      // Fallback for direct matches
      map[header] = index;
    }
  });
  return map;
}

/**
 * Maps a row of values to an object using the header map
 */
function mapRowToColumns(headerMap, values) {
  const row = {};
  Object.entries(headerMap).forEach(([columnName, index]) => {
    row[columnName] = values[index] || "";
  });
  return row;
}

/**
 * Cleans numeric strings of currency symbols and commas
 * @param {string|number} val 
 */
function cleanNumber(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return val;
  const cleaned = val.toString().replace(/[^0-9.-]/g, "");
  return cleaned === "" ? null : cleaned;
}
