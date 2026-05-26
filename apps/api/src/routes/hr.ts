import express, { Router } from 'express'
import { authenticateToken, requireCompanyAccess, AuthRequest } from '../middleware/auth'
import { auditLogger } from '../middleware/audit'
import { HRService } from '../services/hr.service'

const router: Router = express.Router()

// Apply authentication and audit logging to all HR routes
router.use(authenticateToken)
router.use(auditLogger())

// ============================================================================
// LEAVE MANAGEMENT
// ============================================================================

// POST /api/hr/leave - Submit leave request
router.post('/leave', async (req, res) => {
  try {
    const { employeeId, type, startDate, endDate, reason } = req.body
    const submittedBy = (req as any).userId

    const leave = await HRService.submitLeaveRequest({
      employeeId,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason
    }, submittedBy)

    res.json(leave)
  } catch (error) {
    console.error('Error submitting leave request:', error)
    res.status(500).json({ error: 'Failed to submit leave request' })
  }
})

// GET /api/hr/leave - Get leave requests
router.get('/leave', requireCompanyAccess(['employees.view']), async (req, res) => {
  try {
    const {
      employeeId,
      status,
      limit = '50',
      offset = '0'
    } = req.query

    const companyId = (req as AuthRequest).companyId!

    const leaves = await HRService.getLeaveRequests(
      employeeId as string,
      companyId,
      status as string,
      parseInt(limit as string),
      parseInt(offset as string)
    )

    res.json(leaves)
  } catch (error) {
    console.error('Error fetching leave requests:', error)
    res.status(500).json({ error: 'Failed to fetch leave requests' })
  }
})

// PUT /api/hr/leave/:leaveId/approve - Approve leave request
router.put('/leave/:leaveId/approve', requireCompanyAccess(['employees.manage']), async (req, res) => {
  try {
    const { leaveId } = req.params
    const { notes } = req.body
    const approvedBy = (req as any).userId

    const leave = await HRService.processLeaveRequest(leaveId, 'approve', approvedBy, notes)
    res.json(leave)
  } catch (error) {
    console.error('Error approving leave request:', error)
    res.status(500).json({ error: 'Failed to approve leave request' })
  }
})

// PUT /api/hr/leave/:leaveId/reject - Reject leave request
router.put('/leave/:leaveId/reject', requireCompanyAccess(['employees.manage']), async (req, res) => {
  try {
    const { leaveId } = req.params
    const { notes } = req.body
    const approvedBy = (req as any).userId

    const leave = await HRService.processLeaveRequest(leaveId, 'reject', approvedBy, notes)
    res.json(leave)
  } catch (error) {
    console.error('Error rejecting leave request:', error)
    res.status(500).json({ error: 'Failed to reject leave request' })
  }
})

// GET /api/hr/leave/balance/:employeeId - Get leave balance
router.get('/leave/balance/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params
    const balance = await HRService.getLeaveBalance(employeeId)
    res.json(balance)
  } catch (error) {
    console.error('Error fetching leave balance:', error)
    res.status(500).json({ error: 'Failed to fetch leave balance' })
  }
})

// ============================================================================
// INCENTIVES MANAGEMENT
// ============================================================================

// POST /api/hr/incentives - Add incentive
router.post('/incentives', requireCompanyAccess(['payroll.manage']), async (req, res) => {
  try {
    const { employeeId, type, amount, description, date } = req.body
    const addedBy = (req as any).userId

    const incentive = await HRService.addIncentive({
      employeeId,
      type,
      amount,
      description,
      date: new Date(date)
    }, addedBy)

    res.json(incentive)
  } catch (error) {
    console.error('Error adding incentive:', error)
    res.status(500).json({ error: 'Failed to add incentive' })
  }
})

// GET /api/hr/incentives - Get incentives
router.get('/incentives', requireCompanyAccess(['payroll.view']), async (req, res) => {
  try {
    const {
      employeeId,
      month,
      year,
      processed,
      limit = '50',
      offset = '0'
    } = req.query

    const companyId = (req as AuthRequest).companyId!

    const incentives = await HRService.getIncentives(
      employeeId as string,
      companyId,
      month ? parseInt(month as string) : undefined,
      year ? parseInt(year as string) : undefined,
      processed === 'true' ? true : processed === 'false' ? false : undefined
    )

    res.json(incentives)
  } catch (error) {
    console.error('Error fetching incentives:', error)
    res.status(500).json({ error: 'Failed to fetch incentives' })
  }
})

// POST /api/hr/incentives/process/:employeeId/:month/:year - Process incentives for payroll
router.post('/incentives/process/:employeeId/:month/:year', requireCompanyAccess(['payroll.manage']), async (req, res) => {
  try {
    const { employeeId, month, year } = req.params
    const processedBy = (req as any).userId

    const incentives = await HRService.processIncentivesForPayroll(
      employeeId,
      parseInt(month),
      parseInt(year),
      processedBy
    )

    res.json(incentives)
  } catch (error) {
    console.error('Error processing incentives:', error)
    res.status(500).json({ error: 'Failed to process incentives' })
  }
})

// ============================================================================
// COMPLIANCE MANAGEMENT
// ============================================================================

// POST /api/hr/compliance - Submit compliance record
router.post('/compliance', requireCompanyAccess(['payroll.manage']), async (req, res) => {
  try {
    const { employeeId, type, month, year, amount, reference, notes } = req.body
    const submittedBy = (req as any).userId

    const record = await HRService.submitComplianceRecord({
      employeeId,
      type,
      month,
      year,
      amount,
      reference,
      notes
    }, submittedBy)

    res.json(record)
  } catch (error) {
    console.error('Error submitting compliance record:', error)
    res.status(500).json({ error: 'Failed to submit compliance record' })
  }
})

// GET /api/hr/compliance - Get compliance records
router.get('/compliance', requireCompanyAccess(['payroll.view']), async (req, res) => {
  try {
    const {
      employeeId,
      type,
      month,
      year,
      status,
      limit = '50',
      offset = '0'
    } = req.query

    const companyId = (req as AuthRequest).companyId!

    const records = await HRService.getComplianceRecords(
      employeeId as string,
      companyId,
      type as string,
      month ? parseInt(month as string) : undefined,
      year ? parseInt(year as string) : undefined,
      status as string
    )

    res.json(records)
  } catch (error) {
    console.error('Error fetching compliance records:', error)
    res.status(500).json({ error: 'Failed to fetch compliance records' })
  }
})

// ============================================================================
// PAYSLIP GENERATION
// ============================================================================

// GET /api/hr/payslip/:employeeId/:month/:year - Generate payslip data
router.get('/payslip/:employeeId/:month/:year', async (req, res) => {
  try {
    const { employeeId, month, year } = req.params

    const payslip = await HRService.generatePayslipData(
      employeeId,
      parseInt(month),
      parseInt(year)
    )

    res.json(payslip)
  } catch (error) {
    console.error('Error generating payslip:', error)
    res.status(500).json({ error: 'Failed to generate payslip' })
  }
})

// ============================================================================
// ATTENDANCE SUMMARY
// ============================================================================

// GET /api/hr/attendance/summary/:employeeId/:month/:year - Get attendance summary
router.get('/attendance/summary/:employeeId/:month/:year', async (req, res) => {
  try {
    const { employeeId, month, year } = req.params

    const summary = await HRService.getAttendanceSummary(
      employeeId,
      parseInt(month),
      parseInt(year)
    )

    res.json(summary)
  } catch (error) {
    console.error('Error fetching attendance summary:', error)
    res.status(500).json({ error: 'Failed to fetch attendance summary' })
  }
})

// ============================================================================
// GPS & GEOFENCED ATTENDANCE LOGGING
// ============================================================================

// POST /api/hr/attendance/log - Log daily attendance with GPS coordinate verification
router.post('/attendance/log', async (req, res) => {
  try {
    const { employeeId, date, status, checkInLat, checkInLng, checkOutLat, checkOutLng, notes } = req.body
    
    if (!employeeId || !date || !status) {
      return res.status(400).json({ error: 'EmployeeId, date, and status are required' })
    }

    const attendance = await HRService.logDailyAttendance(
      employeeId,
      date,
      status,
      checkInLat !== undefined && checkInLat !== null ? parseFloat(checkInLat) : undefined,
      checkInLng !== undefined && checkInLng !== null ? parseFloat(checkInLng) : undefined,
      checkOutLat !== undefined && checkOutLat !== null ? parseFloat(checkOutLat) : undefined,
      checkOutLng !== undefined && checkOutLng !== null ? parseFloat(checkOutLng) : undefined,
      notes
    )

    res.json(attendance)
  } catch (error) {
    console.error('Error logging attendance with GPS:', error)
    res.status(500).json({ error: 'Failed to log daily attendance' })
  }
})

// PUT /api/hr/employees/:employeeId/upi - Update employee VPA / UPI ID
router.put('/employees/:employeeId/upi', async (req, res) => {
  try {
    const { employeeId } = req.params
    const { upiId } = req.body

    if (!upiId) {
      return res.status(400).json({ error: 'UPI VPA ID is required' })
    }

    const employee = await HRService.updateEmployeeUpiId(employeeId, upiId)
    res.json(employee)
  } catch (error) {
    console.error('Error updating employee UPI ID:', error)
    res.status(500).json({ error: 'Failed to update employee UPI ID' })
  }
})

// POST /api/hr/payroll/:payrollId/whatsapp - Dispatch simulated WhatsApp payslip delivery
router.post('/payroll/:payrollId/whatsapp', async (req, res) => {
  try {
    const { payrollId } = req.params
    const { phone } = req.body

    if (!phone) {
      return res.status(400).json({ error: 'Recipient phone number is required' })
    }

    const payroll = await HRService.sendWhatsAppPayslip(payrollId, phone)
    res.json({ success: true, message: 'Payslip simulated delivery logged successfully', payroll })
  } catch (error) {
    console.error('Error dispatching WhatsApp payslip:', error)
    res.status(500).json({ error: 'Failed to send WhatsApp payslip' })
  }
})

// GET /api/hr/company/geofence - Retrieve company geofencing center coordinates
router.get('/company/geofence', async (req, res) => {
  try {
    const companyId = (req as AuthRequest).companyId!
    const config = await HRService.getCompanyGeofence(companyId)
    res.json(config)
  } catch (error) {
    console.error('Error fetching company geofence configuration:', error)
    res.status(500).json({ error: 'Failed to retrieve geofence configuration' })
  }
})

// POST /api/hr/company/geofence - Set/Update company geofencing center coordinates
router.post('/company/geofence', async (req, res) => {
  try {
    const companyId = (req as AuthRequest).companyId!
    const { lat, lng, geofenceRadius } = req.body

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'Latitude and Longitude are required' })
    }

    const updated = await HRService.updateCompanyGeofence(
      companyId,
      parseFloat(lat),
      parseFloat(lng),
      geofenceRadius !== undefined && geofenceRadius !== null ? parseFloat(geofenceRadius) : 200.0
    )

    res.json(updated)
  } catch (error) {
    console.error('Error updating company geofence configuration:', error)
    res.status(500).json({ error: 'Failed to update geofence configuration' })
  }
})

export default router
