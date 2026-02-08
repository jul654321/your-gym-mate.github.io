import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { usePlans } from "../../hooks/usePlans";
import { Modal } from "../shared/Modal";
import { Select } from "../ui/select";

interface NewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    name: string,
    basedOnPlanId?: string | null,
    planName?: string | null,
    dateMs?: number
  ) => void;
  initialDate?: number;
  isLoading?: boolean;
  error?: string | null;
}

const formatDateInputValue = (value?: number) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

export function NewSessionModal({
  isOpen,
  onClose,
  onCreate,
  initialDate,
  isLoading = false,
  error,
}: NewSessionModalProps) {
  const [name, setName] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [dateISO, setDateISO] = useState(() =>
    formatDateInputValue(initialDate ?? new Date().getTime())
  );
  const {
    data: plans = [],
    isLoading: isPlansLoading,
    error: plansError,
  } = usePlans({ sort: "name" });

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const firstPlanId = plans.length > 0 ? plans[0]?.id : undefined;

        setSelectedPlanId(firstPlanId ?? "");
      }, 0);
    }
  }, [isOpen, plans]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDateISO(formatDateInputValue(initialDate ?? new Date().getTime()));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [initialDate, isOpen]);

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();
    const selectedDateMs = dateISO ? new Date(dateISO).getTime() : undefined;

    onCreate(
      name,
      selectedPlanId || undefined,
      plans.find((plan) => plan.id === selectedPlanId)?.name || undefined,
      selectedDateMs
    );
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      title="Create New Session"
      onClose={onClose}
      actionButtons={[
        <Button
          key="save"
          onClick={(e) => handleSubmit(e)}
          isLoading={isLoading}
          variant="primary"
        >
          Create Session
        </Button>,
      ]}
    >
      <form onSubmit={(event) => handleSubmit(event)}>
        <p className="mt-2 text-sm text-muted-foreground">
          Give your session a name (required). Leave blank to auto-generate one
          based on today’s date.
        </p>

        <div className="mt-4">
          <label
            className="block text-sm font-medium text-muted-foreground mb-1"
            htmlFor="new-session-name"
          >
            Session name
          </label>
          <Input
            id="new-session-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Session name"
          />
        </div>

        <div className="mt-4 space-y-2">
          <label
            className="block text-sm font-medium text-muted-foreground mb-1"
            htmlFor="session-date"
          >
            Session date
          </label>
          <Input
            id="session-date"
            type="date"
            value={dateISO}
            onChange={(event) => setDateISO(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Pick a specific day so the session log uses that timestamp.
          </p>
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="mt-4 space-y-2">
          <label
            className="block text-sm font-medium text-muted-foreground mb-1"
            htmlFor="session-plan"
          >
            Base plan
          </label>
          <Select
            value={selectedPlanId}
            onChange={(event) => setSelectedPlanId(event.target.value)}
            disabled={isPlansLoading}
          >
            <option value="">None</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </Select>
          {plansError && (
            <p className="text-xs text-red-500">
              Unable to load plans: {plansError.message}
            </p>
          )}
          {!isPlansLoading && plans.length === 0 && (
            <p className="text-xs text-muted-foreground">
              You haven’t created any plans yet.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Choosing a plan copies its exercise order into the new session.
          </p>
        </div>
      </form>
    </Modal>
  );
}
