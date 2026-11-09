import { useEffect, useRef } from "react";
import { RULE_BRIEFS } from "../engine/types.ts";

interface RulesDialogProps {
  open: boolean;
  onClose: () => void;
}

export function RulesDialog({ open, onClose }: RulesDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} className="sheet" aria-labelledby="rules-title" onClose={onClose}>
      <div className="sheet-body">
        <h2 id="rules-title">灯是怎么打的</h2>
        <p className="hint">
          全部是关键词、结构和年份。分数到 72 为绿灯，46 为黄灯，再低是红灯。写明「一票红灯」的条目不靠凑分翻盘。模型只能补评语，不能改灯。
        </p>
        <div className="rules">
          {RULE_BRIEFS.map((rule) => (
            <article key={rule.id}>
              <h3>{rule.title}</h3>
              <p>{rule.body}</p>
            </article>
          ))}
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>知道了</button>
        </div>
      </div>
    </dialog>
  );
}
