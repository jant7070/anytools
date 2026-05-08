import { describe, it, expect } from 'vitest'
import { readFileAsDataUrl } from './file'

describe('readFileAsDataUrl', () => {
  it('resolves with a data URL for a valid file', async () => {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    const result = await readFileAsDataUrl(file)
    expect(result).toMatch(/^data:text\/plain;base64,/)
  })

  it('resolves with a string type', async () => {
    const file = new File(['x'], 'img.png', { type: 'image/png' })
    const result = await readFileAsDataUrl(file)
    expect(typeof result).toBe('string')
  })
})
