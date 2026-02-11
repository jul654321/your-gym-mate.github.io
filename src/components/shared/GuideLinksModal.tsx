import { Modal } from "./Modal";
import type { PlanExerciseGuideLinkDTO } from "../../types";

export function GuideLinksModal({
  guideLinks,
  onClose,
}: {
  guideLinks: PlanExerciseGuideLinkDTO[];
  onClose: () => void;
}) {
  return (
    <Modal title="Guide Links" onClose={onClose}>
      <ul className="list-disc list-inside">
        {guideLinks?.map((link) => (
          <li key={link.id}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline"
            >
              {link.title}
            </a>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
