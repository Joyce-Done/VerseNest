import React, { useState } from 'react';
import { Child, CHILD_COLOR_CONFIG, Verse } from '../types';
import { formatReference } from '../bible';
import { Copy, X, Check, Users, AlertCircle } from 'lucide-react';
import { VerseNestStorage } from '../storage';

interface CopySiblingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceChild: Child;
  otherChildren: Child[];
  versesToCopy: Verse[];
  allVerses: Verse[];
  storage: VerseNestStorage;
  onCopyComplete: (copiedCount: number, skippedCount: number, targetChildName: string) => void;
}

export const CopySiblingModal: React.FC<CopySiblingModalProps> = ({
  isOpen,
  onClose,
  sourceChild,
  otherChildren,
  versesToCopy,
  allVerses,
  storage,
  onCopyComplete,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string>(
    otherChildren[0]?.id || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetChild = otherChildren.find((c) => c.id === selectedTargetId) || otherChildren[0];

  // Calculate duplicate analysis for the selected target child
  const targetExistingVerses = allVerses.filter((v) => v.child_id === selectedTargetId);
  const versesStatusInTarget = versesToCopy.map((verse) => {
    const isDuplicate = targetExistingVerses.some(
      (ev) =>
        ev.book === verse.book &&
        ev.chapter === verse.chapter &&
        ev.verse_range.trim() === verse.verse_range.trim()
    );
    return { verse, isDuplicate };
  });

  const duplicateCount = versesStatusInTarget.filter((s) => s.isDuplicate).length;
  const willCopyCount = versesToCopy.length - duplicateCount;

  const handleCopy = async () => {
    if (!targetChild) {
      setErrorMessage('Please select a sibling to copy to.');
      return;
    }

    if (willCopyCount === 0) {
      setErrorMessage(
        `${targetChild.name} already has all ${versesToCopy.length} of these verses in their profile. Duplicate references are automatically prevented.`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const sourceIds = versesToCopy.map((v) => v.id);
      const copiedVerses = await storage.copyVersesToChild(sourceIds, targetChild.id);

      onCopyComplete(copiedVerses.length, duplicateCount, targetChild.name);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#2E2A4A]/10 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#FFFDF7] px-6 py-4 border-b border-[#2E2A4A]/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4DA8DA]/15 text-[#1E6796] flex items-center justify-center">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#2E2A4A] text-lg">
                Add Copy to Sibling
              </h3>
              <p className="text-xs text-[#2E2A4A]/60">
                PRD Section 5.3b • Shared Verse & Folder Repository
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Verses to copy preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#2E2A4A]/70">
                Selected Verses to Copy ({versesToCopy.length})
              </label>
              <span className="text-xs text-[#2E2A4A]/60">
                Source: <strong>{sourceChild.name}</strong>
              </span>
            </div>
            <div className="bg-[#FFFDF7] border border-[#2E2A4A]/10 rounded-2xl p-3 max-h-36 overflow-y-auto divide-y divide-[#2E2A4A]/5">
              {versesStatusInTarget.map(({ verse, isDuplicate }) => (
                <div
                  key={verse.id}
                  className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs gap-2"
                >
                  <div className="truncate">
                    <span className="font-bold text-[#2E2A4A]">
                      {formatReference(verse)}
                    </span>
                    <span className="ml-1.5 text-[11px] text-[#2E2A4A]/50">
                      ({verse.translation})
                    </span>
                  </div>
                  {isDuplicate ? (
                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Already in target (will skip)
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Will Copy (Status: New)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Target Sibling Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2A4A]/70 mb-2">
              Choose Target Sibling Profile:
            </label>

            {otherChildren.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800">
                No other child profiles exist yet. Create another child profile in the switcher bar to copy verses between siblings.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {otherChildren.map((child) => {
                  const isSelected = child.id === selectedTargetId;
                  const colorCfg = CHILD_COLOR_CONFIG[child.avatarColor];
                  const childVersesCount = allVerses.filter(
                    (v) => v.child_id === child.id
                  ).length;

                  return (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => setSelectedTargetId(child.id)}
                      className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                        isSelected
                          ? `${colorCfg.borderClass} bg-[#FFFDF7] shadow-xs ring-2 ring-[#4DA8DA]/20`
                          : 'border-black/10 hover:border-black/25 bg-white'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl ${colorCfg.bgClass} text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs`}
                      >
                        {child.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-sm text-[#2E2A4A] truncate">
                            {child.name}
                          </p>
                          {isSelected && (
                            <Check className="w-4 h-4 text-[#1E6796] shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-[#2E2A4A]/60">
                          {childVersesCount} verses currently
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rules explanation box */}
          <div className="bg-[#4DA8DA]/10 border border-[#4DA8DA]/20 rounded-2xl p-4 text-xs space-y-1 text-[#1E6796]">
            <p className="font-bold flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              Independent Pipeline Rule (PRD 5.3b):
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-[#2E2A4A]/80">
              <li>
                Copied verses start with fresh status <strong>"New"</strong> in{' '}
                {targetChild?.name || 'target'}'s profile.
              </li>
              <li>
                Retains source link with <code>copied_from_verse_id</code>.
              </li>
              <li>
                Duplicate references in the target child profile are automatically skipped to prevent collisions.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#FFFDF7] px-6 py-4 border-t border-[#2E2A4A]/10 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#2E2A4A]/70 hover:text-[#2E2A4A] transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting || otherChildren.length === 0 || willCopyCount === 0}
            onClick={handleCopy}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all ${
              willCopyCount > 0 && otherChildren.length > 0
                ? 'bg-[#1E6796] hover:bg-[#165075] text-white hover:shadow-md'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Copy className="w-4 h-4" />
            {isSubmitting
              ? 'Copying...'
              : `Copy ${willCopyCount} Verse${willCopyCount === 1 ? '' : 's'} to ${targetChild?.name || 'Sibling'}`}
          </button>
        </div>
      </div>
    </div>
  );
};
