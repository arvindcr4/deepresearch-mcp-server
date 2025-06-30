import nock from 'nock'

describe('Test Setup Validation', () => {
  afterEach(() => {
    nock.cleanAll()
  })

  it('should run Jest tests successfully', () => {
    expect(true).toBe(true)
  })

  it('should support nock HTTP mocking', async () => {
    const scope = nock('https://api.example.com')
      .get('/test')
      .reply(200, { message: 'Hello World' })

    const response = await fetch('https://api.example.com/test')
    const data = await response.json()

    expect(data.message).toBe('Hello World')
    expect(scope.isDone()).toBe(true)
  })

  it('should support async/await', async () => {
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms))
    await delay(1)
    expect(true).toBe(true)
  })

  it('should support mock functions', () => {
    const mockFn = jest.fn()
    mockFn('test arg')
    expect(mockFn).toHaveBeenCalledWith('test arg')
  })

  it('should support object matchers', () => {
    const testObj = {
      id: 'test-123',
      timestamp: new Date().toISOString(),
      metadata: {
        provider: 'test',
        version: '1.0.0',
      },
    }

    expect(testObj).toMatchObject({
      id: 'test-123',
      metadata: {
        provider: 'test',
      },
    })
  })
})
