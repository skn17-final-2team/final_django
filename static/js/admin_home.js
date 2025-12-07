// static/js/admin_home.js

document.addEventListener("DOMContentLoaded", function () {
  // 1) 사이드바 부서 노드들(앞에서 dept-item 클래스 붙여둔 것)
  const deptItems = document.querySelectorAll(".dept-item");

  // 2) 가운데 상단 부서 제목 영역
  const deptTitleEl = document.getElementById("admin-dept-title");

  // 3) 직원 테이블 tbody
  const memberTbody = document.getElementById("admin-member-tbody");

  if (!memberTbody) {
    // 예상치 못한 경우를 대비한 방어 코드
    return;
  }

  // 4) 처음 로딩 시점의 모든 직원 행을 메모리에 저장해 둔다.
  const allRows = Array.from(
    memberTbody.querySelectorAll(".admin-member-row")
  );

  /**
   * 선택된 부서 ID에 따라 테이블을 다시 그리는 함수
   * @param {string|null} deptId - 부서 ID (null이면 전체 부서)
   */
  function renderRowsByDept(deptId) {
    // tbody 비우기
    memberTbody.innerHTML = "";

    let rowsToRender;

    if (deptId === null) {
      // 전체 부서: 모든 행
      rowsToRender = allRows;
    } else {
      // 특정 부서만 필터링
      rowsToRender = allRows.filter(function (row) {
        return row.dataset.deptId === String(deptId);
      });
    }

    if (rowsToRender.length === 0) {
      // 해당 부서에 직원이 없으면 "현재 표시할 데이터가 없습니다." 행 추가
      const emptyTr = document.createElement("tr");
      emptyTr.innerHTML =
        '<td colspan="5" class="admin-table-empty">현재 표시할 데이터가 없습니다.</td>';
      memberTbody.appendChild(emptyTr);
      return;
    }

    // 필터링된 행들을 tbody에 다시 붙인다.
    rowsToRender.forEach(function (row) {
      // 동일한 tr을 여러 번 이동시키면 allRows에서 사라지므로, clone해서 사용
      const clone = row.cloneNode(true);
      memberTbody.appendChild(clone);
    });
  }

  /**
   * 사이드바에서 선택된 부서 하이라이트(class 토글)
   */
  function clearActiveDept() {
    deptItems.forEach(function (item) {
      item.classList.remove("dept-item-active");
    });
  }

  // 5) 사이드바의 각 부서 노드에 클릭 이벤트 연결
  deptItems.forEach(function (item) {
    item.addEventListener("click", function () {
      const deptId = this.dataset.deptId;            // 숫자 또는 문자열
      const deptName = this.textContent.trim();      // 화면에 보이는 부서명

      // 사이드바 하이라이트
      clearActiveDept();
      this.classList.add("dept-item-active");

      // 가운데 제목 바꾸기
      if (deptTitleEl) {
        deptTitleEl.textContent = deptName;
      }

      // 테이블 필터링
      renderRowsByDept(deptId);
    });
  });

  // 6) 필요하다면 "전체 부서" 초기 렌더링을 여기서 호출할 수도 있다.
  //    (지금은 템플릿에서 이미 출력된 상태라서 별도 호출은 생략)
  // renderRowsByDept(null);
});

// static/js/admin_home.js

document.addEventListener("DOMContentLoaded", function () {
  const addBtn = document.getElementById("btn-admin-add");
  const rightPanel = document.getElementById("admin-panel-right");
  const closeBtn = document.getElementById("btn-admin-close");

  if (!addBtn || !rightPanel) {
    return;
  }

  addBtn.addEventListener("click", function () {
    rightPanel.classList.add("open");
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      rightPanel.classList.remove("open");
    });
  }
});
