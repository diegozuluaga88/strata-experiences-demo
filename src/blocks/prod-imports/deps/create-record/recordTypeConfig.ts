import { ShoppingCart, ClipboardCheck, type LucideIcon } from 'lucide-react'
import type { RecordType } from './types'

export interface RecordTypeConfig {
    /** Full noun used in titles and success copy: "Purchase order" / "Acknowledgement" */
    label: string
    /** Short code for chips and generated IDs: "PO" / "ACK" */
    code: 'PO' | 'ACK'
    /** Icon used next to title in LeftRail and in chips */
    icon: LucideIcon
    /** Header chip label inside the modal */
    chipLabel: string
    /** PublishedView hero copy */
    successHeroCopy: string
    /** KPI callout dto-paths — order drives display */
    kpiFieldPaths: {
        total: string          // financials path for total amount
        vendor: string         // vendor id path
        date: string           // date path (ETA for PO, ship date for ACK)
    }
    /** KPI callout labels (compact, uppercase) */
    kpiLabels: {
        total: string
        vendor: string
        date: string
    }
}

export const RECORD_TYPE_CONFIG: Record<RecordType, RecordTypeConfig> = {
    PO: {
        label: 'Purchase order',
        code: 'PO',
        icon: ShoppingCart,
        chipLabel: 'REVIEW & CREATE PO',
        successHeroCopy: 'Purchase order created',
        kpiFieldPaths: {
            total: 'financials.poTotalAmount',
            vendor: 'vendor.vendorId',
            date: 'poInfo.orderDate',
        },
        kpiLabels: {
            total: 'PO total',
            vendor: 'Vendor',
            date: 'Order date',
        },
    },
    ACK: {
        label: 'Acknowledgement',
        code: 'ACK',
        icon: ClipboardCheck,
        chipLabel: 'REVIEW & CREATE ACK',
        successHeroCopy: 'Acknowledgement created',
        kpiFieldPaths: {
            total: 'financials.ackTotalAmount',
            vendor: 'vendor.vendorId',
            date: 'ackInfo.acknowledgedShipDate',
        },
        kpiLabels: {
            total: 'ACK total',
            vendor: 'Vendor',
            date: 'Ships',
        },
    },
}

export function configFor(recordType: RecordType): RecordTypeConfig {
    return RECORD_TYPE_CONFIG[recordType]
}
