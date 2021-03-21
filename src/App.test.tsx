import { render, screen } from '@testing-library/react'
import App from './App'

test('renders main control panel', () => {
  render(<App />)
  expect(screen.getByText(/启动/i)).toBeInTheDocument()
})

test('renders credits panel', () => {
  render(<App />)
  expect(screen.getByText(/源代码/i)).toBeInTheDocument()
})