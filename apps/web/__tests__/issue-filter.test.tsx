import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { IssueFilterPanel } from '../components/issue-filter-panel'
import { IssuesWorkspace } from '../components/issues-workspace'
import { getScanIssues, getScanOverview } from '../lib/fixtures/scan-store'

describe('issue filter', () => {
  it('filters by severity and exposes inspect accordion', async () => {
    const issues = await getScanIssues('scan-single-1')
    const seriousCount = issues.filter((i) => i.severity === 'serious').length
    render(<IssueFilterPanel issues={issues} />)
    // Chip order: all, critical, serious, …
    fireEvent.click(
      screen.getByRole('group', { name: 'Severity' }).querySelector('button:nth-child(3)')!,
    )
    expect(screen.getByText(`Showing ${seriousCount} of ${issues.length}`)).toBeTruthy()
    expect(screen.getAllByText(/Lead finding|Inspect/i).length).toBeGreaterThan(0)
  })

  it('keeps remediation detail on single-scan fixtures', async () => {
    const issues = await getScanIssues('scan-single-1')
    expect(issues.length).toBeGreaterThan(20)
    expect(issues.every((i) => Boolean(i.detail))).toBe(true)
    expect(issues.some((i) => Boolean(i.selector))).toBe(true)
    expect(issues.every((i) => Boolean(i.context))).toBe(true)
    expect(issues.every((i) => Boolean(i.wcagLevel))).toBe(true)
    expect(issues.every((i) => Boolean(i.helpUrl))).toBe(true)
    expect(issues.every((i) => Boolean(i.boundingBox))).toBe(true)
  })

  it('syncs capture marker click with rail expand', async () => {
    const overview = await getScanOverview('scan-single-1')
    const issues = await getScanIssues('scan-single-1')
    expect(overview?.screenshotUrl).toBeTruthy()
    render(
      <IssuesWorkspace
        issues={issues}
        screenshotUrl={overview!.screenshotUrl}
        visualLayers={overview!.visualLayers}
      />,
    )
    expect(screen.getByLabelText(/Issue capture/i)).toBeTruthy()
    const findings = screen.getByLabelText(/Findings/i)
    const first = issues.find((i) => i.boundingBox)!
    const markerIndex = issues.filter((i) => i.boundingBox).indexOf(first) + 1
    const marker = screen.getByRole('button', {
      name: `Issue ${markerIndex}: ${first.title}`,
    })
    fireEvent.click(marker)
    expect(marker).toHaveAttribute('aria-pressed', 'true')
    const openRow = findings.querySelector('[aria-expanded="true"]')
    expect(openRow).toBeTruthy()
    expect(openRow?.textContent).toMatch(new RegExp(first.title.slice(0, 20), 'i'))
  })

  it('expands rail row and activates matching marker', async () => {
    const overview = await getScanOverview('scan-single-1')
    const issues = await getScanIssues('scan-single-1')
    const second = issues.find((i) => i.boundingBox && i.id !== issues[0]?.id) ?? issues[1]!
    render(
      <IssuesWorkspace
        issues={issues}
        screenshotUrl={overview!.screenshotUrl}
        visualLayers={overview!.visualLayers}
      />,
    )
    const findings = screen.getByLabelText(/Findings/i)
    const railRow = findings.querySelector(
      `[data-issue-id="${second.id}"] .checkion-issue-rail__row`,
    ) as HTMLButtonElement
    fireEvent.click(railRow)
    const marked = issues.filter((i) => i.boundingBox)
    const markerIndex = marked.findIndex((i) => i.id === second.id) + 1
    expect(
      screen.getByRole('button', { name: `Issue ${markerIndex}: ${second.title}` }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      findings.querySelector(`[data-issue-id="${second.id}"][data-open="true"]`),
    ).toBeTruthy()
  })

  it('switches capture layers to heatmap and regions', async () => {
    const overview = await getScanOverview('scan-single-1')
    const issues = await getScanIssues('scan-single-1')
    expect(overview?.visualLayers?.saliencyHeatmapUrl).toBeTruthy()
    expect(overview?.visualLayers?.regions?.length).toBeGreaterThan(0)
    render(
      <IssuesWorkspace
        issues={issues}
        screenshotUrl={overview!.screenshotUrl}
        visualLayers={overview!.visualLayers}
      />,
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Heatmap' }))
    expect(screen.getByText(/Saliency heatmap/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Regions' }))
    expect(screen.getByText(/page regions/i)).toBeTruthy()
    expect(screen.getByLabelText(/Page regions/i)).toBeTruthy()
  })
})
