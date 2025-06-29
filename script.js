let allData = [];
let currentPage = 1;
const limit = 15;
let filteredData = [];

async function fetchDataOnce() {
  const loaderText = document.getElementById("loader-text");
  const loader = document.getElementById("loader");
  const resContainer = document.getElementById("results");
  const errorBox = document.getElementById("error-message");

  let timeoutMessage = setTimeout(() => {
    loaderText.textContent = "อาจใช้เวลาซักครู่...";
  }, 3000);

  try {
    const res = await fetch(`https://script.google.com/macros/s/AKfycbyflZHP_1yQc7zbOhL29QYw9rwNyyEpmpTpR5xUjpmCdmR2okMUQv15edqNktdYalI/exec`);
    if (!res.ok) throw new Error('HTTP Error');

    const json = await res.json();
    clearTimeout(timeoutMessage);

    allData = json.data;
    filteredData = [...allData];
    loader.style.display = 'none';
    resContainer.style.display = 'block';
    renderList();
    renderPagination();
  } catch (err) {
    clearTimeout(timeoutMessage);
    loader.style.display = 'none';
    errorBox.style.display = 'block';
    console.error("โหลดข้อมูลล้มเหลว:", err);
  }
}

function renderList() {
  const results = document.getElementById('results');
  results.innerHTML = '';

  const paginated = paginate(filteredData, currentPage, limit);
  const grouped = groupByProduct(paginated);

  if (filteredData.length === 0) {
    results.innerHTML = '<p style="text-align:center; color:gray;">ไม่พบข้อมูล</p>';
    return;
  }

  Object.keys(grouped).forEach(name => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'product-group';

    const title = document.createElement('div');
    title.className = 'product-group-title';
    title.textContent = name;
    groupDiv.appendChild(title);

    grouped[name].forEach(item => {
      const div = document.createElement('div');
      div.className = 'product-item';
      div.innerHTML = `
        <div class="product-id">รหัสสินค้า: ${item['รหัสสินค้า']}</div>
        <div class="product-size">ขนาดบรรจุ: ${item['จำนวนต่อหน่วย']} : 1 ${item['หน่วย']}</div>
        <div class="product-price">${item['หน่วย']}ละ ${item['ราคา']} บาท</div>
      `;
      groupDiv.appendChild(div);
    });

    results.appendChild(groupDiv);
  });
}

function paginate(data, page, perPage) {
  const start = (page - 1) * perPage;
  return data.slice(start, start + perPage);
}

function groupByProduct(data) {
  const grouped = {};
  data.forEach(item => {
    const name = item['ชื่อสินค้า'];
    if (!grouped[name]) grouped[name] = [];
    grouped[name].push(item);
  });
  return grouped;
}

function renderPagination() {
  const totalPages = Math.ceil(filteredData.length / limit);
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';

  if (totalPages <= 1) return;

  const createBtn = (text, pageNum, active = false, disabled = false) => {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.margin = '0 5px';
    btn.style.padding = '6px 12px';
    btn.style.borderRadius = '6px';
    btn.style.border = 'none';
    btn.style.background = active ? '#ffffff44' : '#2a2a2a';
    btn.style.color = '#fff';
    btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
    if (!disabled) btn.onclick = () => {
      currentPage = pageNum;
      renderList();
      renderPagination();
    };
    pagination.appendChild(btn);
  };

  createBtn('ก่อนหน้า', currentPage - 1, false, currentPage === 1);

  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(startPage + maxVisible - 1, totalPages);

  if (startPage > 1) {
    createBtn(1, 1);
    if (startPage > 2) pagination.appendChild(document.createTextNode(' ... '));
  }

  for (let i = startPage; i <= endPage; i++) {
    createBtn(i, i, i === currentPage);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) pagination.appendChild(document.createTextNode(' ... '));
    createBtn(totalPages, totalPages);
  }

  createBtn('ถัดไป', currentPage + 1, false, currentPage === totalPages);
}

document.getElementById('search').addEventListener('input', (e) => {
  const keyword = e.target.value.toLowerCase();
  filteredData = allData.filter(item =>
    item['ชื่อสินค้า'].toLowerCase().includes(keyword) ||
    item['รหัสสินค้า'].toString().includes(keyword)
  );
  currentPage = 1;
  renderList();
  renderPagination();
});

fetchDataOnce();

// Barcode scanner
const scanBtn = document.getElementById('scan-barcode');
const scannerEl = document.getElementById('scanner');
const closeBtn = document.getElementById('close-scanner');
const scannerControls = document.getElementById('scanner-controls');
let html5QrCode;

scanBtn.addEventListener('click', () => {
  scannerEl.style.display = "block";
  scannerControls.style.display = "block";

  // ถ้ายังไม่มี instance, ให้สร้าง
  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode("scanner", { verbose: false });
  }

  Html5Qrcode.getCameras().then(devices => {
    const backCamera = devices.find(device =>
      device.label.toLowerCase().includes("back")
    ) || devices[0];

    // ป้องกัน start ซ้ำซ้อน
    if (!html5QrCode._isScanning) {
      html5QrCode.start(
        { deviceId: { exact: backCamera.id } },
        {
          fps: 10,
          qrbox: 250,
          disableFlip: true,
          facingMode: "environment"
        },
        scannedText => {
          document.getElementById('search').value = scannedText;
          html5QrCode.stop().then(() => {
            scannerEl.style.display = "none";
            scannerControls.style.display = "none";
          });
          const event = new Event('input');
          document.getElementById('search').dispatchEvent(event);
        },
        error => {
          // ignore scan errors
        }
      );
    }
  }).catch(err => {
    alert("ไม่สามารถเปิดกล้องได้");
    console.error(err);
  });
});


closeBtn.addEventListener('click', () => {
  if (html5QrCode && html5QrCode._isScanning) {
    html5QrCode.stop().then(() => {
      scannerEl.style.display = "none";
      scannerControls.style.display = "none";
    }).catch(err => {
      console.error("หยุดกล้องไม่สำเร็จ", err);
    });
  } else {
    // fallback เผื่อผู้ใช้กดก่อนเริ่ม
    scannerEl.style.display = "none";
    scannerControls.style.display = "none";
  }
});
