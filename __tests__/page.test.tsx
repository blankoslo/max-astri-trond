import { render, screen } from '@testing-library/react'
import Page from '@/app/page'

describe('Page', () => {
  it('renders the page content', () => {
    render(<Page />)
    expect(screen.getByRole('heading', { name: 'Hackathon team 5' })).toBeInTheDocument()
  })
})