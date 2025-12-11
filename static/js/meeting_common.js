// static/js/meeting_common.js
document.addEventListener("DOMContentLoaded", function () {
  const copyBtn = document.getElementById("btn-copy-full-transcript");
  if (!copyBtn) return;

  copyBtn.addEventListener("click", function () {
    const scrollEl = document.getElementById("assign-transcript-scroll");
    if (!scrollEl) {
      alert("?îõ?????? ??????Ïï? ??????æÀ?.");
      return;
    }

    const text = (scrollEl.innerText || scrollEl.textContent || "").trim();
    if (!text) {
      alert("?îõ????ñ©????ñ©???? ????æÀ?.");
      return;
    }

    // ?ô¯? ??????: Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => alert("??? ?ý³ÚÕíõ¢æ ?ðÂ??ðÂ????îõ?????????"))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  });

  // ñ÷?? ?????????îõ? ?¦â?
  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();

    try {
      const successful = document.execCommand("copy");
      if (successful) {
        alert("??? ?ý³ÚÕíõ¢æ ?ðÂ??ðÂ????îõ?????????");
      } else {
        alert("?îõ? ?ªí?. ?ªë«¸ ????????? ????ñ©£¼???.");
      }
    } catch (err) {
      alert("?îõ? ???ªë?íõ¢æ ?ô¯?????æÀ?.");
    }

    document.body.removeChild(textarea);
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const saveBtn = document.getElementById("btn-transcript-save");
  if (!saveBtn) return;

  const summaryUrl = saveBtn.dataset.summaryUrl;
  if (!summaryUrl) {
    return;
  }

  saveBtn.addEventListener("click", function (event) {
    event.preventDefault();
    window.location.href = summaryUrl;
  });
});
