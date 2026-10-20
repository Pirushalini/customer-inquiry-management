import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NewInquiry } from '../pages/NewInquiry';
import { InquiryDetails } from '../pages/InquiryDetails';
import { api, ApiError } from '../api/client';

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Customer Inquiry Management - Frontend Automated Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // TEST 1 — Inquiry Form Validation
  // --------------------------------------------------------------------------
  it('TEST 1 — Form Validation: displays field-level errors and prevents submission when required fields are missing', async () => {
    const createSpy = vi.spyOn(api.inquiries, 'create');
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <NewInquiry />
      </MemoryRouter>
    );

    // Verify form renders
    expect(screen.getByRole('heading', { name: /record new customer inquiry/i })).toBeInTheDocument();

    // Click submit without entering any data
    const submitBtn = screen.getByRole('button', { name: /submit inquiry/i });
    await user.click(submitBtn);

    // Verify field-level error messages appear
    expect(await screen.findByText(/customer name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/contact information is required/i)).toBeInTheDocument();
    expect(screen.getByText(/subject is required/i)).toBeInTheDocument();
    expect(screen.getByText(/description is required/i)).toBeInTheDocument();

    // Verify API was never called and user remains on form
    expect(createSpy).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // TEST 2 — User Interaction & Form Submission
  // --------------------------------------------------------------------------
  it('TEST 2 — User Interaction: validates input, disables submit button during request, and navigates on success', async () => {
    const user = userEvent.setup();

    // Mock API creation response
    const mockInquiryResponse = {
      message: 'Inquiry created successfully',
      inquiry: {
        id: 42,
        customer_name: 'Dwight Schrute',
        contact: 'dwight@schrutefarms.com',
        subject: 'Artisan Coffee Supply',
        description: 'Requesting quote for seasonal dark roast.',
        status: 'New',
        version: 1,
      },
    };

    let resolveApiCall;
    const pendingPromise = new Promise((resolve) => {
      resolveApiCall = resolve;
    });

    const createSpy = vi.spyOn(api.inquiries, 'create').mockImplementation(() => pendingPromise);

    render(
      <MemoryRouter>
        <NewInquiry />
      </MemoryRouter>
    );

    // Fill valid form inputs
    await user.type(screen.getByLabelText(/customer full name/i), 'Dwight Schrute');
    await user.type(screen.getByLabelText(/contact information/i), 'dwight@schrutefarms.com');
    await user.type(screen.getByLabelText(/inquiry subject/i), 'Artisan Coffee Supply');
    await user.type(screen.getByLabelText(/inquiry description/i), 'Requesting quote for seasonal dark roast.');

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /submit inquiry/i });
    await user.click(submitBtn);

    // 1. Verify submit button is disabled while saving
    expect(submitBtn).toBeDisabled();
    expect(screen.getByRole('button', { name: /saving inquiry\.\.\./i })).toBeInTheDocument();

    // 2. Resolve API response
    resolveApiCall(mockInquiryResponse);

    // 3. Verify API was invoked with trimmed form values
    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        customer_name: 'Dwight Schrute',
        contact: 'dwight@schrutefarms.com',
        subject: 'Artisan Coffee Supply',
        description: 'Requesting quote for seasonal dark roast.',
      });
    });

    // 4. Verify navigation to the new inquiry details page
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/inquiries/42');
    });
  });

  // --------------------------------------------------------------------------
  // TEST 3 — Stale Data Conflict UI (HTTP 409)
  // --------------------------------------------------------------------------
  it('TEST 3 — Conflict UI: shows conflict alert on HTTP 409 and recovers via Reload Latest Data', async () => {
    const user = userEvent.setup();

    const initialInquiry = {
      id: 5,
      customer_name: 'Stanley Hudson',
      contact: 'stanley@pretzelday.org',
      subject: 'Pretzel Day Request',
      description: 'Need on-site dark roast espresso cart.',
      status: 'In Progress',
      version: 1,
      created_at: '2026-10-20T12:00:00Z',
      updated_at: '2026-10-20T12:00:00Z',
    };

    const updatedInquiryFromOtherSession = {
      ...initialInquiry,
      status: 'Resolved',
      version: 2,
      updated_at: '2026-10-20T12:05:00Z',
    };

    // Mock initial getById call
    const getSpy = vi.spyOn(api.inquiries, 'getById').mockResolvedValueOnce({ inquiry: initialInquiry });

    // Mock updateStatus throwing 409 Conflict
    const updateSpy = vi.spyOn(api.inquiries, 'updateStatus').mockRejectedValueOnce(
      new ApiError(409, 'The inquiry has been modified by another session. Please reload the latest data.', {
        currentVersion: 2,
        currentStatus: 'Resolved',
      })
    );

    render(
      <MemoryRouter initialEntries={['/inquiries/5']}>
        <Routes>
          <Route path="/inquiries/:id" element={<InquiryDetails />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for initial inquiry to load
    expect(await screen.findByText('Pretzel Day Request')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();

    // Click Resolve Inquiry action
    const resolveBtn = screen.getByRole('button', { name: /resolve inquiry/i });
    await user.click(resolveBtn);

    expect(updateSpy).toHaveBeenCalledWith(5, { status: 'Resolved', version: 1 });

    // Verify 409 Conflict banner appears with reload button
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/version conflict detected \(http 409\)/i)).toBeInTheDocument();
    expect(screen.getByText(/the inquiry has been modified by another session/i)).toBeInTheDocument();

    const reloadBtn = screen.getByRole('button', { name: /reload latest data/i });
    expect(reloadBtn).toBeInTheDocument();

    // Prepare mock for reload
    getSpy.mockResolvedValueOnce({ inquiry: updatedInquiryFromOtherSession });

    // Click Reload Latest Data
    await user.click(reloadBtn);

    // Verify data refreshed to version 2 and status Resolved
    await waitFor(() => {
      expect(screen.getByText('v2')).toBeInTheDocument();
      expect(screen.getByText('Resolved')).toBeInTheDocument();
    });

    // Conflict banner should be gone
    expect(screen.queryByText(/version conflict detected/i)).not.toBeInTheDocument();

    // Verify next valid lifecycle action is now Reopen
    expect(screen.getByRole('button', { name: /reopen inquiry/i })).toBeInTheDocument();
  });
});
