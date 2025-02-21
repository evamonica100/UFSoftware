
import { render, screen } from '@testing-library/react'
import ScalingIndicesCalculator from '../ScalingIndicesCalculator'

describe('ScalingIndicesCalculator', () => {
  it('renders the calculator', () => {
    render(<ScalingIndicesCalculator />)
    expect(screen.getByText('Scale Indices Calculator')).toBeInTheDocument()
  })
})
