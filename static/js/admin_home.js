document.addEventListener("DOMContentLoaded", function () {
  const deptTree = document.getElementById("admin-dept-tree");
  const rows = document.querySelectorAll(
    "#admin-member-table tbody tr.admin-member-row"
  );
  const titleEl = document.getElementById("admin-dept-title");
  const countEl = document.getElementById("admin-member-count");

  if (!deptTree) return;

  // 선택된 부서에 따라 테이블 필터링
  function updateTable(selectedDeptId, selectedDeptName) {
    let visibleCount = 0;

    rows.forEach((row) => {
      const rowDeptId = row.dataset.deptId || "";

      // selectedDeptId 가 빈 문자열이면 "전체" → 모두 표시
      if (!selectedDeptId || rowDeptId === selectedDeptId) {
        row.style.display = "";
        visibleCount++;
      } else {
        row.style.display = "none";
      }
    });

    if (titleEl) {
      if (!selectedDeptId) {
        titleEl.textContent = "전체 부서";
      } else {
        titleEl.textContent = selectedDeptName;
      }
    }

    if (countEl) {
      countEl.textContent = visibleCount + "명";
    }
  }

  // 사이드바에서 부서 라벨 클릭 처리
  deptTree.addEventListener("click", function (e) {
    const label = e.target.closest(".admin-dept-label");
    if (!label) return;

    deptTree
      .querySelectorAll(".admin-dept-label-selected")
      .forEach((el) => el.classList.remove("admin-dept-label-selected"));
    label.classList.add("admin-dept-label-selected");

    const selectedDeptId = label.dataset.deptId || "";
    const selectedDeptName = label.textContent.trim();

    updateTable(selectedDeptId, selectedDeptName);
  });

  // 페이지 처음 로드 시 전체 부서로 초기화
  updateTable("", "");
});
