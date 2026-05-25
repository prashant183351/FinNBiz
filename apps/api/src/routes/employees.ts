import express, { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticateToken, requireCompanyAccess, AuthRequest } from '../middleware/auth'

const router: Router = Router()
const prisma = new PrismaClient()

// GET /api/employees - Get all employees for a company
router.get('/', authenticateToken, requireCompanyAccess(), async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.companyId!
    const { department, active = 'true', search } = req.query

    let where: any = { companyId }

    if (department && department !== 'all') {
      where.department = department
    }

    if (active !== 'all') {
      where.active = active === 'true'
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { employeeId: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } }
      ]
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        _count: {
          select: {
            attendance: true,
            payrolls: true,
            advances: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    res.json(employees)
  } catch (error) {
    console.error('Error fetching employees:', error)
    res.status(500).json({ error: 'Failed to fetch employees' })
  }
})

// GET /api/employees/:id - Get single employee details
router.get('/:id', authenticateToken, requireCompanyAccess(), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params
    const companyId = req.companyId!

    const employee = await prisma.employee.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        attendance: {
          orderBy: { date: 'desc' },
          take: 30 // Last 30 days
        },
        payrolls: {
          orderBy: { year: 'desc', month: 'desc' },
          take: 12 // Last 12 months
        },
        advances: {
          where: { deducted: false },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            attendance: true,
            payrolls: true,
            advances: true
          }
        }
      }
    })

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    res.json(employee)
  } catch (error) {
    console.error('Error fetching employee:', error)
    res.status(500).json({ error: 'Failed to fetch employee' })
  }
})

// POST /api/employees - Create new employee
router.post('/', authenticateToken, requireCompanyAccess(), async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.companyId!
    const {
      employeeId,
      name,
      phone,
      email,
      role,
      department,
      salary,
      joinDate,
      bankAccount,
      bankName,
      ifscCode,
      panNumber,
      aadhaarNumber,
      address,
      emergencyContact
    } = req.body

    if (!name || !role || !salary) {
      return res.status(400).json({ error: 'Name, role, and salary are required' })
    }

    // Generate employee ID if not provided
    let finalEmployeeId = employeeId
    if (!finalEmployeeId) {
      const count = await prisma.employee.count({ where: { companyId } })
      finalEmployeeId = `EMP${String(count + 1).padStart(3, '0')}`
    }

    const employee = await prisma.employee.create({
      data: {
        companyId,
        employeeId: finalEmployeeId,
        name,
        phone,
        email,
        role,
        department,
        salary: parseFloat(salary),
        joinDate: new Date(joinDate),
        bankAccount,
        bankName,
        ifscCode,
        panNumber,
        aadhaarNumber,
        address,
        emergencyContact
      }
    })

    res.status(201).json(employee)
  } catch (error: any) {
    console.error('Error creating employee:', error)
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Employee ID already exists' })
    }
    res.status(500).json({ error: 'Failed to create employee' })
  }
})

// PUT /api/employees/:id - Update employee
router.put('/:id', authenticateToken, requireCompanyAccess(['employee:update']), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params
    const companyId = req.companyId!
    const {
      employeeId,
      name,
      phone,
      email,
      role,
      department,
      salary,
      joinDate,
      active,
      bankAccount,
      bankName,
      ifscCode,
      panNumber,
      aadhaarNumber,
      address,
      emergencyContact
    } = req.body

    const employee = await prisma.employee.update({
      where: {
        id,
        companyId
      },
      data: {
        employeeId,
        name,
        phone,
        email,
        role,
        department,
        salary: salary ? parseFloat(salary) : undefined,
        joinDate: joinDate ? new Date(joinDate) : undefined,
        active,
        bankAccount,
        bankName,
        ifscCode,
        panNumber,
        aadhaarNumber,
        address,
        emergencyContact
      }
    })

    res.json(employee)
  } catch (error: any) {
    console.error('Error updating employee:', error)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Employee not found' })
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Employee ID already exists' })
    }
    res.status(500).json({ error: 'Failed to update employee' })
  }
})

// DELETE /api/employees/:id - Delete employee (soft delete by setting active=false)
router.delete('/:id', authenticateToken, requireCompanyAccess(['employee:delete']), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params
    const companyId = req.companyId!

    await prisma.employee.update({
      where: {
        id,
        companyId
      },
      data: {
        active: false
      }
    })

    res.status(204).send()
  } catch (error: any) {
    console.error('Error deleting employee:', error)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Employee not found' })
    }
    res.status(500).json({ error: 'Failed to delete employee' })
  }
})

// GET /api/employees/departments - Get unique departments
router.get('/meta/departments', authenticateToken, requireCompanyAccess(), async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.companyId!

    const departments = await prisma.employee.findMany({
      where: { companyId, active: true },
      select: { department: true },
      distinct: ['department']
    })

    const uniqueDepartments = departments
      .map((d: any) => d.department)
      .filter(Boolean)
      .sort()

    res.json(uniqueDepartments)
  } catch (error) {
    console.error('Error fetching departments:', error)
    res.status(500).json({ error: 'Failed to fetch departments' })
  }
})

// GET /api/employees/stats/summary - Get employee statistics
router.get('/stats/summary', authenticateToken, requireCompanyAccess(), async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.companyId!

    const [totalEmployees, activeEmployees, totalSalary] = await Promise.all([
      prisma.employee.count({ where: { companyId } }),
      prisma.employee.count({ where: { companyId, active: true } }),
      prisma.employee.aggregate({
        where: { companyId, active: true },
        _sum: { salary: true }
      })
    ])

    res.json({
      totalEmployees,
      activeEmployees,
      inactiveEmployees: totalEmployees - activeEmployees,
      totalMonthlySalary: totalSalary._sum.salary || 0
    })
  } catch (error) {
    console.error('Error fetching employee stats:', error)
    res.status(500).json({ error: 'Failed to fetch employee statistics' })
  }
})

export default router
