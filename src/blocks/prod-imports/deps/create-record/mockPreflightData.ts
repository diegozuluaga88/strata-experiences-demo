import type {
    Preflight,
    PreflightField,
    LineItem,
    PreflightSection,
    ExtraField,
    RecordType,
    KnownValue,
} from './types'

interface SourceDoc {
    id: string
    name: string
    vendor: string
    type: string
}

// Whether a doc gets a "messy" preflight (with inconsistencies) or "clean" one.
// Overrides keep demo behavior predictable; replace with backend data when real.
const FORCE_CLEAN = new Set(['OCR-007']) // always goes to toast (simple path)
const FORCE_MESSY = new Set(['OCR-006']) // always opens the modal (PO demo)

export function isMessyPreflight(doc: SourceDoc): boolean {
    if (FORCE_CLEAN.has(doc.id)) return false
    if (FORCE_MESSY.has(doc.id)) return true
    const lastDigit = parseInt(doc.id.slice(-1), 10)
    return Number.isFinite(lastDigit) ? lastDigit % 2 !== 0 : true
}

export function recordTypeFromDoc(doc: SourceDoc): RecordType {
    return doc.type === 'Acknowledgment' ? 'ACK' : 'PO'
}

// ─── Shared known-value sets ──────────────────────────────────────────────

const VENDOR_OPTIONS: KnownValue[] = [
    { id: 99, label: 'Acme Corp' },
    { id: 100, label: 'AIS Furniture' },
    { id: 101, label: 'Apex Furniture' },
    { id: 102, label: 'Atlas Supply' },
    { id: 103, label: 'Steelcase' },
    { id: 104, label: 'Herman Miller' },
    { id: 105, label: 'Knoll' },
    { id: 106, label: 'Haworth' },
    { id: 107, label: '9to5 Seating' },
    { id: 108, label: 'Kimball' },
    { id: 109, label: 'National Office' },
    { id: 110, label: 'Avalon Seating' },
]

const STATE_OPTIONS: KnownValue[] = [
    { id: 1, label: 'FL' }, { id: 2, label: 'CA' }, { id: 3, label: 'NY' },
    { id: 4, label: 'TX' }, { id: 5, label: 'WA' }, { id: 6, label: 'IL' },
    { id: 7, label: 'MA' }, { id: 8, label: 'GA' }, { id: 9, label: 'PA' },
    { id: 10, label: 'OH' }, { id: 11, label: 'NC' }, { id: 12, label: 'VA' },
    { id: 13, label: 'NJ' }, { id: 14, label: 'CO' }, { id: 15, label: 'AZ' },
]

const TERMS_OPTIONS: KnownValue[] = [
    { id: 421, label: 'Net 30' }, { id: 422, label: 'Net 45' }, { id: 423, label: 'Net 60' },
    { id: 424, label: '2/10 Net 30' }, { id: 425, label: 'Due on receipt' },
]

const REQUEST_TYPE_OPTIONS: KnownValue[] = [
    { id: 612, label: 'Standard' }, { id: 613, label: 'Expedited' },
    { id: 614, label: 'Sample' }, { id: 615, label: 'Replacement' },
    { id: 616, label: 'Warranty' }, { id: 617, label: 'Backorder' },
]

const FREIGHT_TERMS_OPTIONS: KnownValue[] = [
    { id: 8001, label: 'FOB Destination' }, { id: 8002, label: 'FOB Origin' },
    { id: 8003, label: 'Prepaid' }, { id: 8004, label: 'Prepaid & Add' },
    { id: 8005, label: 'Collect' },
]

const LOCATION_TYPE_OPTIONS: KnownValue[] = [
    { id: 9011, label: 'Commercial' }, { id: 9012, label: 'Residential' },
    { id: 9013, label: 'Healthcare' }, { id: 9014, label: 'Education' },
    { id: 9015, label: 'Government' },
]

const DEALER_STATUS_OPTIONS: KnownValue[] = [
    { id: 7201, label: 'Active' }, { id: 7202, label: 'On Hold' },
    { id: 7203, label: 'Partial Ship' }, { id: 7204, label: 'Closed' },
]

const SALES_PERSON_OPTIONS: KnownValue[] = [
    { id: 2001, label: 'V. Ruiz' }, { id: 2002, label: 'M. Webb' },
    { id: 2003, label: 'P. Shah' }, { id: 2004, label: 'D. Okafor' },
    { id: 2005, label: 'E. Martínez' }, { id: 2006, label: 'N. Fischer' },
]

const REGION_OPTIONS: KnownValue[] = [
    { id: 311, label: 'Southeast' }, { id: 312, label: 'Northeast' },
    { id: 313, label: 'Midwest' }, { id: 314, label: 'Southwest' },
    { id: 315, label: 'West' },
]

const PROCESSORS_OPTIONS: KnownValue[] = [
    { id: 7, label: 'Viviana Ruiz' }, { id: 8, label: 'Marcus Webb' },
    { id: 9, label: 'Priya Shah' }, { id: 10, label: 'Daniel Okafor' },
    { id: 11, label: 'Elena Martínez' }, { id: 12, label: 'Noah Fischer' },
    { id: 13, label: 'Renée Laurent' }, { id: 14, label: 'Tomás Álvarez' },
]

const FURNITURE_SUBCATEGORY_OPTIONS: KnownValue[] = [
    { id: 40, label: 'Acoustics' }, { id: 41, label: 'Seating' },
    { id: 42, label: 'Desking' }, { id: 43, label: 'Storage' },
    { id: 44, label: 'Lighting' }, { id: 45, label: 'Tables' },
    { id: 46, label: 'Lounge' }, { id: 47, label: 'Power & Data' },
]

const CATALOG_CODE_OPTIONS: KnownValue[] = [
    { id: 77, label: 'Widget A' }, { id: 88, label: 'Widget B' }, { id: 99, label: 'Widget C' },
]

const ACK_STATUS_OPTIONS: KnownValue[] = [
    { id: 5101, label: 'Received' }, { id: 5102, label: 'In Production' },
    { id: 5103, label: 'Partial Ship' }, { id: 5104, label: 'Shipped' },
    { id: 5105, label: 'On Hold' },
]

const LINE_STATUS_OPTIONS: KnownValue[] = [
    { id: 6101, label: 'Confirmed' }, { id: 6102, label: 'Backorder' },
    { id: 6103, label: 'Substituted' }, { id: 6104, label: 'Cancelled' },
]

// ─── PO schema builders ───────────────────────────────────────────────────

function poSections(vendor: string, messy: boolean): PreflightSection[] {
    const vendorMatch = VENDOR_OPTIONS.find(v => v.label === vendor)
    const vendorId = vendorMatch?.id ?? 99

    return [
        {
            id: 'poInfo',
            label: 'PO info',
            fields: [
                { dtoPath: 'poInfo.orderNumber', displayName: 'Order Number', targetDataType: 'String', inputValue: 'PO-001', resolution: 'resolved', resolvedValue: 'PO-001', required: true },
                messy
                    ? { dtoPath: 'poInfo.poIssueDate', displayName: 'PO Issue Date', targetDataType: 'Date', inputValue: 'tomorrow', resolution: 'coercion_error', reason: 'INVALID_DATE', required: true }
                    : { dtoPath: 'poInfo.poIssueDate', displayName: 'PO Issue Date', targetDataType: 'Date', inputValue: '2026-04-22', resolution: 'resolved', resolvedValue: '2026-04-22', required: true },
                { dtoPath: 'poInfo.orderDate', displayName: 'Order Date', targetDataType: 'Date', inputValue: '2026-01-15', resolution: 'resolved', resolvedValue: '2026-01-15' },
                { dtoPath: 'poInfo.terms', displayName: 'Terms', targetDataType: 'DropDown', inputValue: 'Net 30', resolution: 'resolved', resolvedValue: 421, knownValues: TERMS_OPTIONS },
                messy
                    ? { dtoPath: 'poInfo.requestType', displayName: 'Request Type', targetDataType: 'DropDown', inputValue: 'Standrd', resolution: 'ai_suggested', suggestion: 612, aiConfidence: 0.94, required: true, knownValues: REQUEST_TYPE_OPTIONS }
                    : { dtoPath: 'poInfo.requestType', displayName: 'Request Type', targetDataType: 'DropDown', inputValue: 'Standard', resolution: 'resolved', resolvedValue: 612, required: true, knownValues: REQUEST_TYPE_OPTIONS },
            ],
        },
        {
            id: 'vendor',
            label: 'Vendor',
            fields: [
                messy
                    ? { dtoPath: 'vendor.vendorId', displayName: 'Vendor', targetDataType: 'DropDown', inputValue: vendor.slice(0, 3).toLowerCase(), resolution: 'ai_uncertain', suggestion: vendorId, aiConfidence: 0.51, required: true, knownValues: VENDOR_OPTIONS }
                    : { dtoPath: 'vendor.vendorId', displayName: 'Vendor', targetDataType: 'DropDown', inputValue: vendor, resolution: 'resolved', resolvedValue: vendorId, required: true, knownValues: VENDOR_OPTIONS },
                { dtoPath: 'vendor.billToName', displayName: 'Bill To Name', targetDataType: 'String', inputValue: `${vendor} · AP Dept`, resolution: 'resolved', resolvedValue: `${vendor} · AP Dept` },
                messy
                    ? { dtoPath: 'vendor.email', displayName: 'Vendor Email', targetDataType: 'Email', inputValue: 'ap@' + vendor.split(' ')[0].toLowerCase(), resolution: 'coercion_error', reason: 'INVALID_EMAIL' }
                    : { dtoPath: 'vendor.email', displayName: 'Vendor Email', targetDataType: 'Email', inputValue: `ap@${vendor.split(' ')[0].toLowerCase()}.com`, resolution: 'resolved', resolvedValue: `ap@${vendor.split(' ')[0].toLowerCase()}.com` },
                { dtoPath: 'vendor.phone', displayName: 'Vendor Phone', targetDataType: 'Phone', inputValue: '+1 (555) 010-0199', resolution: 'resolved', resolvedValue: '+1 (555) 010-0199' },
                { dtoPath: 'vendor.dealerStatus', displayName: 'Dealer Status', targetDataType: 'DropDown', inputValue: 'Partial Ship', resolution: 'resolved', resolvedValue: 7203, knownValues: DEALER_STATUS_OPTIONS },
            ],
        },
        {
            id: 'shipping',
            label: 'Shipping',
            fields: [
                {
                    dtoPath: 'shipping.shipTo', displayName: 'Ship To', targetDataType: 'Object', inputValue: null, resolution: messy ? 'unresolved' : 'resolved', isObject: true,
                    children: [
                        { dtoPath: 'shipping.shipTo.name', displayName: 'Name', targetDataType: 'String', inputValue: `${vendor} Warehouse`, resolution: 'resolved', resolvedValue: `${vendor} Warehouse` },
                        { dtoPath: 'shipping.shipTo.street', displayName: 'Street', targetDataType: 'String', inputValue: '500 Warehouse Way', resolution: 'resolved', resolvedValue: '500 Warehouse Way' },
                        { dtoPath: 'shipping.shipTo.city', displayName: 'City', targetDataType: 'String', inputValue: 'Miami', resolution: 'resolved', resolvedValue: 'Miami' },
                        messy
                            ? { dtoPath: 'shipping.shipTo.state', displayName: 'State', targetDataType: 'DropDown', inputValue: 'XX', resolution: 'unresolved', reason: 'VALUE_NOT_IN_LIST', knownValues: STATE_OPTIONS }
                            : { dtoPath: 'shipping.shipTo.state', displayName: 'State', targetDataType: 'DropDown', inputValue: 'FL', resolution: 'resolved', resolvedValue: 1, knownValues: STATE_OPTIONS },
                        { dtoPath: 'shipping.shipTo.postalCode', displayName: 'Postal code', targetDataType: 'String', inputValue: '33101', resolution: 'resolved', resolvedValue: '33101' },
                        { dtoPath: 'shipping.shipTo.country', displayName: 'Country', targetDataType: 'String', inputValue: 'US', resolution: 'resolved', resolvedValue: 'US' },
                    ],
                },
                { dtoPath: 'shipping.freightTerms', displayName: 'Freight Terms', targetDataType: 'DropDown', inputValue: 'FOB Destination', resolution: 'resolved', resolvedValue: 8001, knownValues: FREIGHT_TERMS_OPTIONS },
                { dtoPath: 'shipping.installComplete', displayName: 'Install Complete', targetDataType: 'Boolean', inputValue: true, resolution: 'resolved', resolvedValue: 'true' },
                { dtoPath: 'shipping.locationType', displayName: 'Location Type', targetDataType: 'DropDown', inputValue: 'Commercial', resolution: 'resolved', resolvedValue: 9011, knownValues: LOCATION_TYPE_OPTIONS },
            ],
        },
        {
            id: 'financials',
            label: 'Financials',
            fields: [
                { dtoPath: 'financials.poTotalAmount', displayName: 'PO Total Amount', targetDataType: 'Currency', inputValue: 12489.95, resolution: 'resolved', resolvedValue: '12489.95', required: true },
                { dtoPath: 'financials.productSubtotal', displayName: 'Product Subtotal', targetDataType: 'Currency', inputValue: 11740.00, resolution: 'resolved', resolvedValue: '11740.00' },
                { dtoPath: 'financials.freight2', displayName: 'Freight', targetDataType: 'Currency', inputValue: 249.95, resolution: 'resolved', resolvedValue: '249.95' },
                messy
                    ? { dtoPath: 'financials.salesTax', displayName: 'Sales Tax', targetDataType: 'Currency', inputValue: 'n/a', resolution: 'coercion_error', reason: 'NOT_A_NUMBER' }
                    : { dtoPath: 'financials.salesTax', displayName: 'Sales Tax', targetDataType: 'Currency', inputValue: 500.00, resolution: 'resolved', resolvedValue: '500.00' },
                { dtoPath: 'financials.discountAmount', displayName: 'Discount Amount', targetDataType: 'Currency', inputValue: 500.00, resolution: 'resolved', resolvedValue: '500.00' },
            ],
        },
        {
            id: 'project',
            label: 'Project',
            fields: [
                { dtoPath: 'project.endCustomerName', displayName: 'End Customer Name', targetDataType: 'String', inputValue: 'Avanto HQ Refresh', resolution: 'resolved', resolvedValue: 'Avanto HQ Refresh' },
                { dtoPath: 'project.salesPerson', displayName: 'Sales Person', targetDataType: 'DropDown', inputValue: 'V. Ruiz', resolution: 'resolved', resolvedValue: 2001, knownValues: SALES_PERSON_OPTIONS },
                { dtoPath: 'project.region', displayName: 'Region', targetDataType: 'DropDown', inputValue: 'Southeast', resolution: 'resolved', resolvedValue: 311, knownValues: REGION_OPTIONS },
                messy
                    ? { dtoPath: 'project.processors', displayName: 'Processors', targetDataType: 'Multiselect', inputValue: ['viviana', 'unknown', 'priya'], resolution: 'partial', reason: 'PARTIAL_LIST_MATCH', suggestion: [7, null, 9], knownValues: PROCESSORS_OPTIONS }
                    : { dtoPath: 'project.processors', displayName: 'Processors', targetDataType: 'Multiselect', inputValue: ['viviana', 'priya'], resolution: 'resolved', resolvedValue: [7, 9], knownValues: PROCESSORS_OPTIONS },
                { dtoPath: 'project.furnitureRequired', displayName: 'Furniture Required', targetDataType: 'Boolean', inputValue: true, resolution: 'resolved', resolvedValue: 'true' },
                { dtoPath: 'project.furnitureSubCategory', displayName: 'Furniture Sub Category', targetDataType: 'Multiselect', inputValue: ['seating', 'desking'], resolution: 'resolved', resolvedValue: [41, 42], knownValues: FURNITURE_SUBCATEGORY_OPTIONS },
            ],
        },
        {
            id: 'approvalsAndNotes',
            label: 'Notes',
            fields: [
                { dtoPath: 'approvalsAndNotes.notes', displayName: 'Notes', targetDataType: 'String', inputValue: `Confirmed pricing w/ ${vendor} on 4/18`, resolution: 'resolved', resolvedValue: `Confirmed pricing w/ ${vendor} on 4/18` },
                { dtoPath: 'approvalsAndNotes.additionalComments', displayName: 'Additional Comments', targetDataType: 'String', inputValue: 'Rush for Q2 open house', resolution: 'unmapped' },
            ],
        },
    ]
}

function poLineItems(messy: boolean): LineItem[] {
    return [
        {
            rowIndex: 0,
            fields: [
                { dtoPath: 'productNumber', displayName: 'Product Number', targetDataType: 'String', inputValue: 'SKU-1', resolution: 'resolved', resolvedValue: 'SKU-1', required: true },
                { dtoPath: 'productDescription', displayName: 'Description', targetDataType: 'String', inputValue: 'Aeron — Size B, Graphite', resolution: 'resolved', resolvedValue: 'Aeron — Size B, Graphite' },
                { dtoPath: 'quantity', displayName: 'Qty', targetDataType: 'Number', inputValue: 2, resolution: 'resolved', resolvedValue: 2, required: true },
                { dtoPath: 'productList', displayName: 'List', targetDataType: 'Currency', inputValue: 1295.00, resolution: 'resolved', resolvedValue: '1295.00' },
                { dtoPath: 'productCost', displayName: 'Unit Cost', targetDataType: 'Currency', inputValue: 49.99, resolution: 'resolved', resolvedValue: '49.99' },
                messy
                    ? { dtoPath: 'catalogCode', displayName: 'Catalog Code', targetDataType: 'DropDown', inputValue: 'widg-a', resolution: 'ai_suggested', suggestion: 77, aiConfidence: 0.88, knownValues: CATALOG_CODE_OPTIONS }
                    : { dtoPath: 'catalogCode', displayName: 'Catalog Code', targetDataType: 'DropDown', inputValue: 'Widget A', resolution: 'resolved', resolvedValue: 77, knownValues: CATALOG_CODE_OPTIONS },
            ],
        },
        {
            rowIndex: 1,
            fields: [
                { dtoPath: 'productNumber', displayName: 'Product Number', targetDataType: 'String', inputValue: 'SKU-2', resolution: 'resolved', resolvedValue: 'SKU-2', required: true },
                { dtoPath: 'productDescription', displayName: 'Description', targetDataType: 'String', inputValue: 'Eames Soft Pad, Low Back', resolution: 'resolved', resolvedValue: 'Eames Soft Pad, Low Back' },
                { dtoPath: 'quantity', displayName: 'Qty', targetDataType: 'Number', inputValue: 5, resolution: 'resolved', resolvedValue: 5, required: true },
                { dtoPath: 'productList', displayName: 'List', targetDataType: 'Currency', inputValue: 2890.00, resolution: 'resolved', resolvedValue: '2890.00' },
                { dtoPath: 'productCost', displayName: 'Unit Cost', targetDataType: 'Currency', inputValue: 12.5, resolution: 'resolved', resolvedValue: '12.50' },
                messy
                    ? { dtoPath: 'catalogCode', displayName: 'Catalog Code', targetDataType: 'DropDown', inputValue: '???', resolution: 'unresolved', reason: 'VALUE_NOT_IN_LIST', knownValues: CATALOG_CODE_OPTIONS }
                    : { dtoPath: 'catalogCode', displayName: 'Catalog Code', targetDataType: 'DropDown', inputValue: 'Widget B', resolution: 'resolved', resolvedValue: 88, knownValues: CATALOG_CODE_OPTIONS },
            ],
        },
        {
            rowIndex: 2,
            fields: [
                { dtoPath: 'productNumber', displayName: 'Product Number', targetDataType: 'String', inputValue: 'SKU-3', resolution: 'resolved', resolvedValue: 'SKU-3', required: true },
                { dtoPath: 'productDescription', displayName: 'Description', targetDataType: 'String', inputValue: 'Steelcase Leap v2', resolution: 'resolved', resolvedValue: 'Steelcase Leap v2' },
                { dtoPath: 'quantity', displayName: 'Qty', targetDataType: 'Number', inputValue: 1, resolution: 'resolved', resolvedValue: 1, required: true },
                { dtoPath: 'productList', displayName: 'List', targetDataType: 'Currency', inputValue: 1100.00, resolution: 'resolved', resolvedValue: '1100.00' },
                { dtoPath: 'productCost', displayName: 'Unit Cost', targetDataType: 'Currency', inputValue: 880.00, resolution: 'resolved', resolvedValue: '880.00' },
                { dtoPath: 'catalogCode', displayName: 'Catalog Code', targetDataType: 'DropDown', inputValue: 'Widget A', resolution: 'resolved', resolvedValue: 77, knownValues: CATALOG_CODE_OPTIONS },
            ],
        },
    ]
}

// ─── ACK schema builders ──────────────────────────────────────────────────

function ackSections(vendor: string, messy: boolean): PreflightSection[] {
    const vendorMatch = VENDOR_OPTIONS.find(v => v.label === vendor)
    const vendorId = vendorMatch?.id ?? 99

    return [
        {
            id: 'ackInfo',
            label: 'ACK info',
            fields: [
                { dtoPath: 'ackInfo.acknowledgementNumber', displayName: 'ACK Number', targetDataType: 'String', inputValue: 'ACK-7842', resolution: 'resolved', resolvedValue: 'ACK-7842', required: true },
                messy
                    ? { dtoPath: 'ackInfo.acknowledgementDate', displayName: 'ACK Date', targetDataType: 'Date', inputValue: 'last week', resolution: 'coercion_error', reason: 'INVALID_DATE', required: true }
                    : { dtoPath: 'ackInfo.acknowledgementDate', displayName: 'ACK Date', targetDataType: 'Date', inputValue: '2026-01-13', resolution: 'resolved', resolvedValue: '2026-01-13', required: true },
                { dtoPath: 'ackInfo.acknowledgedShipDate', displayName: 'Acknowledged Ship Date', targetDataType: 'Date', inputValue: '2026-02-15', resolution: 'resolved', resolvedValue: '2026-02-15' },
                { dtoPath: 'ackInfo.referencePoNumber', displayName: 'Reference PO', targetDataType: 'String', inputValue: 'ORD-2055', resolution: 'resolved', resolvedValue: 'ORD-2055', required: true },
                { dtoPath: 'ackInfo.vendorOrderNumber', displayName: 'Vendor Order Number', targetDataType: 'String', inputValue: `${vendor.split(' ')[0].toUpperCase()}-1151064`, resolution: 'resolved', resolvedValue: `${vendor.split(' ')[0].toUpperCase()}-1151064` },
                messy
                    ? { dtoPath: 'ackInfo.ackStatus', displayName: 'ACK Status', targetDataType: 'DropDown', inputValue: 'In Prod', resolution: 'ai_suggested', suggestion: 5102, aiConfidence: 0.92, required: true, knownValues: ACK_STATUS_OPTIONS }
                    : { dtoPath: 'ackInfo.ackStatus', displayName: 'ACK Status', targetDataType: 'DropDown', inputValue: 'In Production', resolution: 'resolved', resolvedValue: 5102, required: true, knownValues: ACK_STATUS_OPTIONS },
            ],
        },
        {
            id: 'vendorAndBillTo',
            label: 'Vendor & Bill To',
            fields: [
                messy
                    ? { dtoPath: 'vendor.vendorId', displayName: 'Vendor', targetDataType: 'DropDown', inputValue: vendor.slice(0, 4).toLowerCase(), resolution: 'ai_uncertain', suggestion: vendorId, aiConfidence: 0.58, required: true, knownValues: VENDOR_OPTIONS }
                    : { dtoPath: 'vendor.vendorId', displayName: 'Vendor', targetDataType: 'DropDown', inputValue: vendor, resolution: 'resolved', resolvedValue: vendorId, required: true, knownValues: VENDOR_OPTIONS },
                { dtoPath: 'billTo.name', displayName: 'Bill To Name', targetDataType: 'String', inputValue: 'Strata Workplace Solutions', resolution: 'resolved', resolvedValue: 'Strata Workplace Solutions' },
                { dtoPath: 'billTo.address', displayName: 'Bill To Address', targetDataType: 'String', inputValue: '3400 Pegasus Park Dr, Dallas, TX 75247', resolution: 'resolved', resolvedValue: '3400 Pegasus Park Dr, Dallas, TX 75247' },
                messy
                    ? { dtoPath: 'contact.salesEmail', displayName: 'Sales Email', targetDataType: 'Email', inputValue: 'sjohnson@' + vendor.split(' ')[0].toLowerCase(), resolution: 'coercion_error', reason: 'INVALID_EMAIL' }
                    : { dtoPath: 'contact.salesEmail', displayName: 'Sales Email', targetDataType: 'Email', inputValue: `sjohnson@${vendor.split(' ')[0].toLowerCase()}.com`, resolution: 'resolved', resolvedValue: `sjohnson@${vendor.split(' ')[0].toLowerCase()}.com` },
                { dtoPath: 'contact.salesRep', displayName: 'Sales Rep', targetDataType: 'String', inputValue: 'Sarah Johnson', resolution: 'resolved', resolvedValue: 'Sarah Johnson' },
            ],
        },
        {
            id: 'shipping',
            label: 'Shipping',
            fields: [
                {
                    dtoPath: 'shipping.shipTo', displayName: 'Ship To', targetDataType: 'Object', inputValue: null, resolution: messy ? 'unresolved' : 'resolved', isObject: true,
                    children: [
                        { dtoPath: 'shipping.shipTo.name', displayName: 'Name', targetDataType: 'String', inputValue: 'Avanto HQ', resolution: 'resolved', resolvedValue: 'Avanto HQ' },
                        { dtoPath: 'shipping.shipTo.street', displayName: 'Street', targetDataType: 'String', inputValue: '1200 Commerce Dr, Suite 400', resolution: 'resolved', resolvedValue: '1200 Commerce Dr, Suite 400' },
                        { dtoPath: 'shipping.shipTo.city', displayName: 'City', targetDataType: 'String', inputValue: 'Dallas', resolution: 'resolved', resolvedValue: 'Dallas' },
                        messy
                            ? { dtoPath: 'shipping.shipTo.state', displayName: 'State', targetDataType: 'DropDown', inputValue: 'TXX', resolution: 'unresolved', reason: 'VALUE_NOT_IN_LIST', knownValues: STATE_OPTIONS }
                            : { dtoPath: 'shipping.shipTo.state', displayName: 'State', targetDataType: 'DropDown', inputValue: 'TX', resolution: 'resolved', resolvedValue: 4, knownValues: STATE_OPTIONS },
                        { dtoPath: 'shipping.shipTo.postalCode', displayName: 'Postal code', targetDataType: 'String', inputValue: '75201', resolution: 'resolved', resolvedValue: '75201' },
                        { dtoPath: 'shipping.shipTo.country', displayName: 'Country', targetDataType: 'String', inputValue: 'US', resolution: 'resolved', resolvedValue: 'US' },
                    ],
                },
                { dtoPath: 'shipping.shipVia', displayName: 'Ship Via', targetDataType: 'String', inputValue: `${vendor} Fleet — White Glove`, resolution: 'resolved', resolvedValue: `${vendor} Fleet — White Glove` },
                { dtoPath: 'shipping.freightTerms', displayName: 'Freight Terms', targetDataType: 'DropDown', inputValue: 'Prepaid & Add', resolution: 'resolved', resolvedValue: 8004, knownValues: FREIGHT_TERMS_OPTIONS },
            ],
        },
        {
            id: 'financials',
            label: 'Financials (vendor confirmed)',
            fields: [
                { dtoPath: 'financials.ackTotalAmount', displayName: 'ACK Total Amount', targetDataType: 'Currency', inputValue: 9067.60, resolution: 'resolved', resolvedValue: '9067.60', required: true },
                { dtoPath: 'financials.productSubtotal', displayName: 'Product Subtotal', targetDataType: 'Currency', inputValue: 9067.60, resolution: 'resolved', resolvedValue: '9067.60' },
                { dtoPath: 'financials.freight', displayName: 'Freight', targetDataType: 'Currency', inputValue: 0, resolution: 'resolved', resolvedValue: '0.00' },
                messy
                    ? { dtoPath: 'financials.salesTax', displayName: 'Sales Tax', targetDataType: 'Currency', inputValue: 'tbd', resolution: 'coercion_error', reason: 'NOT_A_NUMBER' }
                    : { dtoPath: 'financials.salesTax', displayName: 'Sales Tax', targetDataType: 'Currency', inputValue: 748.08, resolution: 'resolved', resolvedValue: '748.08' },
            ],
        },
        {
            id: 'approvalsAndNotes',
            label: 'Notes',
            fields: [
                { dtoPath: 'approvalsAndNotes.vendorNotes', displayName: 'Vendor Notes', targetDataType: 'String', inputValue: 'Imported from vendor acknowledgement file', resolution: 'resolved', resolvedValue: 'Imported from vendor acknowledgement file' },
                { dtoPath: 'approvalsAndNotes.productionNotes', displayName: 'Production Notes', targetDataType: 'String', inputValue: 'Lot tagged for HQ refresh project', resolution: 'unmapped' },
            ],
        },
    ]
}

function ackLineItems(messy: boolean): LineItem[] {
    return [
        {
            rowIndex: 0,
            fields: [
                { dtoPath: 'productNumber', displayName: 'Product Number', targetDataType: 'String', inputValue: 'TBL-30x60-29H', resolution: 'resolved', resolvedValue: 'TBL-30x60-29H', required: true },
                { dtoPath: 'productDescription', displayName: 'Description', targetDataType: 'String', inputValue: 'TBL, REC, 30Dx60Wx29H', resolution: 'resolved', resolvedValue: 'TBL, REC, 30Dx60Wx29H' },
                { dtoPath: 'ackQuantity', displayName: 'ACK Qty', targetDataType: 'Number', inputValue: 4, resolution: 'resolved', resolvedValue: 4, required: true },
                { dtoPath: 'unitPrice', displayName: 'Unit Price', targetDataType: 'Currency', inputValue: 479.18, resolution: 'resolved', resolvedValue: '479.18' },
                { dtoPath: 'lineTotal', displayName: 'Total', targetDataType: 'Currency', inputValue: 1916.72, resolution: 'resolved', resolvedValue: '1916.72' },
                { dtoPath: 'lineStatus', displayName: 'Line Status', targetDataType: 'DropDown', inputValue: 'Confirmed', resolution: 'resolved', resolvedValue: 6101, knownValues: LINE_STATUS_OPTIONS },
            ],
        },
        {
            rowIndex: 1,
            fields: [
                { dtoPath: 'productNumber', displayName: 'Product Number', targetDataType: 'String', inputValue: 'CBX-BBF-PED', resolution: 'resolved', resolvedValue: 'CBX-BBF-PED', required: true },
                { dtoPath: 'productDescription', displayName: 'Description', targetDataType: 'String', inputValue: 'CBX Full Depth BBF Ped', resolution: 'resolved', resolvedValue: 'CBX Full Depth BBF Ped' },
                { dtoPath: 'ackQuantity', displayName: 'ACK Qty', targetDataType: 'Number', inputValue: 4, resolution: 'resolved', resolvedValue: 4, required: true },
                { dtoPath: 'unitPrice', displayName: 'Unit Price', targetDataType: 'Currency', inputValue: 398.24, resolution: 'resolved', resolvedValue: '398.24' },
                { dtoPath: 'lineTotal', displayName: 'Total', targetDataType: 'Currency', inputValue: 1592.96, resolution: 'resolved', resolvedValue: '1592.96' },
                messy
                    ? { dtoPath: 'lineStatus', displayName: 'Line Status', targetDataType: 'DropDown', inputValue: 'Backorder?', resolution: 'unresolved', reason: 'VALUE_NOT_IN_LIST', knownValues: LINE_STATUS_OPTIONS }
                    : { dtoPath: 'lineStatus', displayName: 'Line Status', targetDataType: 'DropDown', inputValue: 'Confirmed', resolution: 'resolved', resolvedValue: 6101, knownValues: LINE_STATUS_OPTIONS },
            ],
        },
        {
            rowIndex: 2,
            fields: [
                { dtoPath: 'productNumber', displayName: 'Product Number', targetDataType: 'String', inputValue: 'WS-RECT-30x72', resolution: 'resolved', resolvedValue: 'WS-RECT-30x72', required: true },
                { dtoPath: 'productDescription', displayName: 'Description', targetDataType: 'String', inputValue: 'WORKSURFACE RECT 30Dx72W', resolution: 'resolved', resolvedValue: 'WORKSURFACE RECT 30Dx72W' },
                { dtoPath: 'ackQuantity', displayName: 'ACK Qty', targetDataType: 'Number', inputValue: 6, resolution: 'resolved', resolvedValue: 6, required: true },
                { dtoPath: 'unitPrice', displayName: 'Unit Price', targetDataType: 'Currency', inputValue: 249.28, resolution: 'resolved', resolvedValue: '249.28' },
                { dtoPath: 'lineTotal', displayName: 'Total', targetDataType: 'Currency', inputValue: 1495.68, resolution: 'resolved', resolvedValue: '1495.68' },
                messy
                    ? { dtoPath: 'lineStatus', displayName: 'Line Status', targetDataType: 'DropDown', inputValue: 'Subbed', resolution: 'ai_suggested', suggestion: 6103, aiConfidence: 0.85, knownValues: LINE_STATUS_OPTIONS }
                    : { dtoPath: 'lineStatus', displayName: 'Line Status', targetDataType: 'DropDown', inputValue: 'Substituted', resolution: 'resolved', resolvedValue: 6103, knownValues: LINE_STATUS_OPTIONS },
            ],
        },
    ]
}

// ─── Extras ───────────────────────────────────────────────────────────────

function extras(_recordType: RecordType): ExtraField[] {
    return [
        { id: 'dealer-company', label: 'Dealer Company', dataType: 'String', value: 'Avanto', included: true, required: true },
        {
            id: 'sold-to', label: 'Sold To', dataType: 'Object', included: true, required: true,
            objectValue: {
                values: [
                    { label: 'Account', value: 'Avanto Sold' },
                    { label: 'Street', value: '100 Market St' },
                    { label: 'City', value: 'San Francisco' },
                    { label: 'State', value: 'CA' },
                    { label: 'Postal code', value: '94103' },
                    { label: 'Country', value: 'US' },
                ],
            },
        },
    ]
}

// ─── Public dispatcher ────────────────────────────────────────────────────

export function getPreflightForDoc(doc: SourceDoc): Preflight {
    const recordType = recordTypeFromDoc(doc)
    const messy = isMessyPreflight(doc)

    const sections = recordType === 'PO'
        ? poSections(doc.vendor, messy)
        : ackSections(doc.vendor, messy)

    const lineItems = recordType === 'PO'
        ? poLineItems(messy)
        : ackLineItems(messy)

    return {
        recordType,
        environment: 'qa',
        sections,
        lineItems,
        extras: extras(recordType),
    }
}

// Helper used by callers that only need a yes/no for routing decisions
// (e.g. "open modal" vs "show toast directly"). Implemented in usePreflight.
export type { SourceDoc }

// Re-export field signature expected by FieldRow consumers
export type { PreflightField, LineItem, PreflightSection, ExtraField, Preflight }
