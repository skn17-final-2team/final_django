const dropzone = document.getElementById('dropzone');
const hiddenInput = document.getElementById('hidden-file');
const preview = document.getElementById('preview');
const uploadBtn = document.getElementById('upload-btn');
const csrftoken = document.querySelector("input[name='csrfmiddlewaretoken']")?.value;

let selectedFiles = []; // 드래그/선택된 파일을 저장해두는 배열 (전역)

// 클릭으로 파일 선택
dropzone.addEventListener('click', () => hiddenInput.click());

// 드래그 기본 동작 막기
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});

// 강조 스타일
['dragenter', 'dragover'].forEach(name => {
    dropzone.addEventListener(name, () => dropzone.classList.add('highlight'));
});
['dragleave', 'drop'].forEach(name => {
    dropzone.addEventListener(name, () => dropzone.classList.remove('highlight'));
});

// 드롭, input 선택 처리
['drop', 'change'].forEach(eventType => {
    const target = eventType === 'drop' ? dropzone : hiddenInput;
    target.addEventListener(eventType, (e) => {
        const files = eventType === 'drop' ? e.dataTransfer.files : e.target.files;
        handleFiles(files);
    });
});

// 파일 처리
function handleFiles(fileList) {
    if (!fileList || fileList.length === 0) return;

    const file = fileList[0];      // 한 개만 사용
    const allowed = ["wav"];

    // 확장자 체크
    const ext = file.name.split(".").pop().toLowerCase();
    if (!allowed.includes(ext)) {
        alert("wav 파일만 업로드할 수 있습니다.");
        // 선택 초기화
        selectedFiles = [];
        preview.innerHTML = '';
        if (hiddenInput) hiddenInput.value = "";
        return;
    }

    // 업로드 확인
    const ok = confirm(`${file.name} (${Math.round(file.size / 1024)} KB)를 업로드하시겠습니까?`);
    if (!ok) {
        // 취소하면 선택/미리보기 초기화
        selectedFiles = [];
        preview.innerHTML = '';
        if (hiddenInput) hiddenInput.value = "";
        return;
    }
    selectedFiles = [file];

    // 미리보기 렌더
    preview.innerHTML = '';
    const item = document.createElement('div');
    item.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
    preview.appendChild(item);
}

// 업로드 버튼 클릭 시 실행
uploadBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) {
        alert('업로드할 파일이 없습니다');
        return;
    }
    const pathParts = window.location.pathname.split('/');
    const meetingId = pathParts[2];
    
    const formData = new FormData();

    formData.append('file', selectedFiles[0]);
    try {
        const res = await fetch(`/meetings/${meetingId}/upload/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrftoken,
            },
            body: formData,
        });

        if (res.ok) {
            alert('업로드 성공!');
            // 필요하면 selectedFiles/preview 초기화
            selectedFiles = [];
            preview.innerHTML = '';
            if (hiddenInput) hiddenInput.value = "";
            window.location.href = `/meetings/${meetingId}/rendering/`;
        } else {
            const data = await res.json().catch(() => ({}));
            alert(`업로드 실패: ${data.error ?? '알 수 없는 오류'}`);
        }
    } catch (err) {
        console.error(err);
        alert('업로드 중 오류가 발생했습니다.');
    }
});