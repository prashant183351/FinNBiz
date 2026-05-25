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

export default router
