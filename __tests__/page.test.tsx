import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import Page from '@/app/page'

describe('Page', () => {
  it('renders the page content', () => {
    render(<Page />)
    expect(screen.getByText('friluftskompis')).toBeInTheDocument()
  })
})