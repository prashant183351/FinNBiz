import { PrismaClient } from '@prisma/client'
import { AuditService } from './audit.service'

const prisma = new PrismaClient()

export interface LeaveRequest {
  employeeId: string
  type: 'casual' | 'sick' | 'earned' | 'maternity' | 'paternity'
  startDate: Date
  endDate: Date
  reason?: string
}

export interface IncentiveData {
  employeeId: string
  type: 'overtime' | 'bonus' | 'commission' | 'performance'
  amount: number
  description?: string
  date: Date
}

export interface ComplianceData {
  employeeId: string
  type: 'pf' | 'esi' | 'tds'
  month: number
  year: number
  amount: number
  reference?: string
  notes?: string
}

export class HRService {
  /**
   * Submit a leave request
   */
  static async submitLeaveRequest(
    request: LeaveRequest,
    submittedBy: string
  ): Promise<any> {
    // Calculate leave days
    const startDate = new Date(request.startDate)
    const endDate = new Date(request.endDate)
    const timeDiff = endDate.getTime() - startDate.getTime()
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1 // Include both start and end dates

    const leave = await prisma.leave.create({
      data: {
        employeeId: request.employeeId,
        type: request.type,
        startDate: request.startDate,
        endDate: request.endDate,
        days,
        reason: request.reason
      },
      include: {
        employee: {
          select: { name: true, email: true }
        }
      }
    })

    // Log audit event
    await AuditService.log({
      userId: submittedBy,
      action: 'create',
      resource: 'leave',
      resourceId: leave.id,
      details: {
        type: request.type,
        days,
        startDate: request.startDate,
        endDate: request.endDate
      },
      success: true
    })

    return leave
  }

  /**
   * Approve or reject leave request
   */
  static async processLeaveRequest(
    leaveId: string,
    action: 'approve' | 'reject',
    approvedBy: string,
    notes?: string
  ): Promise<any> {
    const status = action === 'approve' ? 'approved' : 'rejected'

    const leave = await prisma.leave.update({
      where: { id: leaveId },
      data: {
        status,
        approvedBy,
        approvedAt: new Date(),
        notes
      },
      include: {
        employee: {
          select: { name: true, email: true }
        }
      }
    })

    // Log audit event
    await AuditService.log({
      userId: approvedBy,
      action: action,
      resource: 'leave',
      resourceId: leaveId,
      details: { status, notes },
      success: true
    })

    return leave
  }

  /**
   * Get leave requests for an employee or company
   */
  static async getLeaveRequests(
    employeeId?: string,
    companyId?: string,
    status?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    const where: any = {}

    if (employeeId) where.employeeId = employeeId
    if (companyId) {
      where.employee = { companyId }
    }
    if (status) where.status = status

    return prisma.leave.findMany({
      where,
      include: {
        employee: {
          select: {
            name: true,
            email: true,
            department: true,
            employeeId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })
  }

  /**
   * Add incentive/allowance for employee
   */
  static async addIncentive(
    incentive: IncentiveData,
    addedBy: string
  ): Promise<any> {
    const record = await prisma.incentive.create({
      data: {
        employeeId: incentive.employeeId,
        type: incentive.type,
        amount: incentive.amount,
        description: incentive.description,
        date: incentive.date,
        month: incentive.date.getMonth() + 1,
        year: incentive.date.getFullYear()
      },
      include: {
        employee: {
          select: { name: true, email: true }
        }
      }
    })

    // Log audit event
    await AuditService.log({
      userId: addedBy,
      action: 'create',
      resource: 'incentive',
      resourceId: record.id,
      details: {
        type: incentive.type,
        amount: incentive.amount,
        employeeId: incentive.employeeId
      },
      success: true
    })

    return record
  }

  /**
   * Get incentives for employee or company
   */
  static async getIncentives(
    employeeId?: string,
    companyId?: string,
    month?: number,
    year?: number,
    processed?: boolean
  ): Promise<any[]> {
    const where: any = {}

    if (employeeId) where.employeeId = employeeId
    if (companyId) {
      where.employee = { companyId }
    }
    if (month) where.month = month
    if (year) where.year = year
    if (processed !== undefined) where.processed = processed

    return prisma.incentive.findMany({
      where,
      include: {
        employee: {
          select: {
            name: true,
            email: true,
            department: true,
            employeeId: true
          }
        }
      },
      orderBy: { date: 'desc' }
    })
  }

  /**
   * Process incentives into payroll
   */
  static async processIncentivesForPayroll(
    employeeId: string,
    month: number,
    year: number,
    processedBy: string
  ): Promise<any[]> {
    // Get unprocessed incentives for the month
    const incentives = await prisma.incentive.findMany({
      where: {
        employeeId,
        month,
        year,
        processed: false
      }
    })

    // Mark as processed
    await prisma.incentive.updateMany({
      where: {
        employeeId,
        month,
        year,
        processed: false
      },
      data: { processed: true }
    })

    // Log audit event
    await AuditService.log({
      userId: processedBy,
      action: 'process',
      resource: 'incentives',
      details: {
        employeeId,
        month,
        year,
        count: incentives.length,
        totalAmount: incentives.reduce((sum, inc) => sum + inc.amount, 0)
      },
      success: true
    })

    return incentives
  }

  /**
   * Submit compliance record (PF/ESI/TDS)
   */
  static async submitComplianceRecord(
    compliance: ComplianceData,
    submittedBy: string
  ): Promise<any> {
    const record = await prisma.complianceRecord.create({
      data: {
        employeeId: compliance.employeeId,
        type: compliance.type,
        month: compliance.month,
        year: compliance.year,
        amount: compliance.amount,
        reference: compliance.reference,
        notes: compliance.notes,
        status: 'submitted',
        submittedAt: new Date()
      },
      include: {
        employee: {
          select: { name: true, email: true, employeeId: true }
        }
      }
    })

    // Log audit event
    await AuditService.log({
      userId: submittedBy,
      action: 'submit',
      resource: 'compliance',
      resourceId: record.id,
      details: {
        type: compliance.type,
        month: compliance.month,
        year: compliance.year,
        amount: compliance.amount
      },
      success: true
    })

    return record
  }

  /**
   * Get compliance records
   */
  static async getComplianceRecords(
    employeeId?: string,
    companyId?: string,
    type?: string,
    month?: number,
    year?: number,
    status?: string
  ): Promise<any[]> {
    const where: any = {}

    if (employeeId) where.employeeId = employeeId
    if (companyId) {
      where.employee = { companyId }
    }
    if (type) where.type = type
    if (month) where.month = month
    if (year) where.year = year
    if (status) where.status = status

    return prisma.complianceRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            name: true,
            email: true,
            employeeId: true,
            department: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    })
  }

  /**
   * Calculate leave balance for employee
   */
  static async getLeaveBalance(employeeId: string): Promise<any> {
    const currentYear = new Date().getFullYear()

    // Get approved leaves for current year
    const approvedLeaves = await prisma.leave.findMany({
      where: {
        employeeId,
        status: 'approved',
        startDate: {
          gte: new Date(currentYear, 0, 1),
          lte: new Date(currentYear, 11, 31)
        }
      }
    })

    // Calculate used leaves by type
    const usedLeaves = approvedLeaves.reduce((acc, leave) => {
      acc[leave.type] = (acc[leave.type] || 0) + leave.days
      return acc
    }, {} as Record<string, number>)

    // Default leave balances (customize based on company policy)
    const totalLeaves = {
      casual: 12,
      sick: 6,
      earned: 24,
      maternity: 180, // days
      paternity: 15
    }

    const balance = Object.keys(totalLeaves).reduce((acc, type) => {
      acc[type] = {
        total: totalLeaves[type as keyof typeof totalLeaves],
        used: usedLeaves[type] || 0,
        remaining: totalLeaves[type as keyof typeof totalLeaves] - (usedLeaves[type] || 0)
      }
      return acc
    }, {} as Record<string, { total: number; used: number; remaining: number }>)

    return balance
  }

  /**
   * Generate payslip data
   */
  static async generatePayslipData(employeeId: string, month: number, year: number): Promise<any> {
    // Get employee details
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        employeeId: true,
        name: true,
        salary: true,
        department: true,
        joinDate: true
      }
    })

    if (!employee) throw new Error('Employee not found')

    // Get payroll record if exists
    const payroll = await prisma.payroll.findUnique({
      where: {
        employeeId_month_year: {
          employeeId,
          month,
          year
        }
      }
    })

    // Get incentives for the month
    const incentives = await prisma.incentive.findMany({
      where: {
        employeeId,
        month,
        year,
        processed: true
      }
    })

    // Calculate totals
    const totalIncentives = incentives.reduce((sum, inc) => sum + inc.amount, 0)

    return {
      employee,
      period: { month, year },
      earnings: {
        basicSalary: employee.salary,
        incentives: totalIncentives,
        totalEarnings: employee.salary + totalIncentives
      },
      deductions: payroll ? {
        pf: payroll.pf,
        esi: payroll.esi,
        tds: payroll.tds,
        advances: payroll.advances,
        totalDeductions: payroll.deductions
      } : null,
      netPay: payroll?.netPay || (employee.salary + totalIncentives),
      incentives: incentives.map(inc => ({
        type: inc.type,
        amount: inc.amount,
        description: inc.description
      })),
      generatedAt: new Date()
    }
  }

  /**
   * Get attendance summary for employee
   */
  static async getAttendanceSummary(
    employeeId: string,
    month: number,
    year: number
  ): Promise<any> {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0) // Last day of month

    const attendance = await prisma.attendance.findMany({
      where: {
        employeeId,
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const summary = attendance.reduce((acc, record) => {
      acc.totalDays++
      ;(acc as any)[record.status.toLowerCase()] = ((acc as any)[record.status.toLowerCase()] || 0) + 1
      acc.totalHours += record.hoursWorked || 0
      acc.totalOvertime += record.overtime || 0
      return acc
    }, {
      totalDays: 0,
      present: 0,
      absent: 0,
      half: 0,
      leave: 0,
      holiday: 0,
      totalHours: 0,
      totalOvertime: 0
    })

    return {
      employeeId,
      period: { month, year },
      ...summary,
      attendancePercentage: summary.totalDays > 0 ? (summary.present / summary.totalDays) * 100 : 0
    }
  }

  /**
   * Log daily attendance with GPS coordinate verification using Haversine formula
   */
  static async logDailyAttendance(
    employeeId: string,
    dateStr: string,
    status: 'Present' | 'Absent' | 'Half',
    checkInLat?: number,
    checkInLng?: number,
    checkOutLat?: number,
    checkOutLng?: number,
    notes?: string
  ): Promise<any> {
    const checkDate = new Date(dateStr)
    checkDate.setUTCHours(0, 0, 0, 0)

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { company: true }
    })

    if (!employee) {
      throw new Error('Employee not found')
    }

    const company = employee.company
    let isGeofenced = true

    if (checkInLat !== undefined && checkInLng !== undefined && company?.lat !== null && company?.lng !== null && company?.lat !== undefined && company?.lng !== undefined) {
      const cLat = company.lat as number
      const cLng = company.lng as number
      const radius = company.geofenceRadius || 200.0

      // Haversine distance formula
      const R = 6371000 // Earth's radius in meters
      const dLat = (checkInLat - cLat) * Math.PI / 180
      const dLng = (checkInLng - cLng) * Math.PI / 180
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(cLat * Math.PI / 180) * Math.cos(checkInLat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const distance = R * c

      if (distance > radius) {
        isGeofenced = false
      }
    }

    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: checkDate
        }
      }
    })

    let attendanceRecord
    const now = new Date()

    if (existing) {
      attendanceRecord = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status,
          checkOut: now,
          checkOutLat,
          checkOutLng,
          notes: notes || existing.notes,
          hoursWorked: existing.checkIn ? parseFloat(((now.getTime() - existing.checkIn.getTime()) / (1000 * 60 * 60)).toFixed(2)) : null
        }
      })
    } else {
      attendanceRecord = await prisma.attendance.create({
        data: {
          employeeId,
          date: checkDate,
          status,
          checkIn: now,
          checkInLat,
          checkInLng,
          isGeofenced,
          notes
        }
      })
    }

    return attendanceRecord
  }

  /**
   * Update employee UPI ID
   */
  static async updateEmployeeUpiId(employeeId: string, upiId: string): Promise<any> {
    return prisma.employee.update({
      where: { id: employeeId },
      data: { upiId }
    })
  }

  /**
   * Send simulated WhatsApp Payslip
   */
  static async sendWhatsAppPayslip(payrollId: string, phone: string): Promise<any> {
    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
      include: { employee: true }
    })

    if (!payroll) {
      throw new Error('Payroll not found')
    }

    console.log(`[WhatsApp Payslip Simulator] Dispatching to ${phone} for ${payroll.employee.name}: Net Pay ₹${payroll.netPay}`)

    return prisma.payroll.update({
      where: { id: payrollId },
      data: {
        whatsappSentAt: new Date(),
        whatsappPhone: phone
      }
    })
  }

  /**
   * Get company geofencing configuration
   */
  static async getCompanyGeofence(companyId: string): Promise<any> {
    return prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        lat: true,
        lng: true,
        geofenceRadius: true
      }
    })
  }

  /**
   * Update company geofencing configuration
   */
  static async updateCompanyGeofence(
    companyId: string,
    lat: number,
    lng: number,
    geofenceRadius: number
  ): Promise<any> {
    return prisma.company.update({
      where: { id: companyId },
      data: {
        lat,
        lng,
        geofenceRadius
      },
      select: {
        id: true,
        name: true,
        lat: true,
        lng: true,
        geofenceRadius: true
      }
    })
  }
}
