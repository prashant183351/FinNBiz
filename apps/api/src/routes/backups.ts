import express from 'express'
import { authenticateToken } from '../middleware/auth'
import { BackupService } from '../services/backup.service'

const router: express.Router = express.Router()

// All backup routes require admin/manager level access
router.use(authenticateToken)

// Get backup statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await BackupService.getBackupStats()
    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
})

// Get backup history
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50
    const offset = parseInt(req.query.offset as string) || 0
    const status = req.query.status as string
    const type = req.query.type as string

    const history = await BackupService.getBackupHistory({ limit, offset, status, type })
    res.json(history)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
})

// Create new backup
router.post('/', async (req, res) => {
  try {
    const { type, encrypt, uploadToCloud } = req.body
    
    // Trigger backup process
    // In a real production env, this might be sent to a worker queue
    // For now, we await it directly as requested by the UI
    const result = await BackupService.createBackup({
      type: type || 'full',
      encrypt: encrypt !== undefined ? encrypt : true,
      uploadToCloud: uploadToCloud !== undefined ? uploadToCloud : false
    })

    res.status(201).json({ message: 'Backup created successfully', backup: result })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create backup' })
  }
})

// Restore backup
router.post('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params
    await BackupService.restoreBackup(id)
    res.json({ message: 'Database restored successfully' })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to restore backup' })
  }
})

// Delete backup
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await BackupService.deleteBackup(id)
    res.json({ message: 'Backup deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete backup' })
  }
})

export default router
