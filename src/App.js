import { useEffect, useState } from "react";
import "./App.css";
import { ReactHiererchyChart } from "react-hierarchy-chart";
import axios from "axios";
import { getErrorMessage } from "./getErrorMessage";
import { Tag, Space } from "antd";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import EnImg from "./en.png";
import EnLoading from "./loading.png";

function App() {
  const [nodes, setNodes] = useState([]);
  const [error, setError] = useState("");
  const [employeeList, setEmployeeList] = useState([]);
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const paramValue = urlParams.get("token");
  const [loading, setLoading] = useState(true);

  function buildTree(flat) {
    // Step 1: Create a map from id -> node
    const map = new Map();
    flat.forEach((item) => {
      map.set(item.id, {
        key: item.id,
        name: item.name,
        code: item.sort_name,
        primary_department: item.primary_department,
        head_department: item.head_department,
        approve_manager: item.approve_manager,
        childs: undefined,
        level: null, // will be assigned later
      });
    });

    let root = null;

    // Step 2: Link children to parents
    flat.forEach((item) => {
      const parentId = Array.isArray(item.parent_id) ? item.parent_id[0] : null;
      if (parentId && map.has(parentId)) {
        if (!map.get(parentId).childs) {
          map.get(parentId).childs = [];
        }
        map.get(parentId).childs.push(map.get(item.id));
      } else if (!item.parent_id || item.parent_id === false) {
        // This is the root node
        root = map.get(item.id);
      }
    });

    // Step 3: Assign levels using DFS
    function assignLevels(node, currentLevel) {
      node.level = currentLevel;
      if (node.childs) {
        node.childs.forEach((child) => assignLevels(child, currentLevel + 1));
      }
    }

    if (root) {
      assignLevels(root, 1);
    }

    return root;
  }

  const fetchValues = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `https://seatek-api.seateklab.vn/api/get-departments-through-access-token?token=${paramValue}`
      );
      let departmentList = data.data;
      setEmployeeList(data.listOfHrEmployeeMultiCompany);

      if (departmentList.length > 0) {
        departmentList = departmentList.map((i) => {
          return { ...i, parent_id: i.parent_id || [999999, i.company_id[1]] };
        });

        let currentCompanyNode = {
          approve_manager: false,
          head_department: false,
          id: 999999,
          name: departmentList[0].company_id[1],
          parent_id: false,
          primary_department: false,
          isFirstNode: true,
        };

        departmentList.push(currentCompanyNode);
      }
      const tree = buildTree(departmentList);
      setNodes([tree]);
    } catch (error) {
      const msg = getErrorMessage(error);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchValues();
  }, []);

  if (loading)
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <img alt="" src={EnLoading} style={{ width: 170 }} />
        <h2>Đang tải dữ liệu</h2>
      </div>
    );

  return error ? (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <img alt="" src={EnImg} style={{ width: 170 }} />
      <h2>
        {error === "jwt expired"
          ? "Link hết hiệu lực truy cập"
          : error === "invalid token"
          ? "Mã truy cập không hợp lệ"
          : error === "jwt malformed"
          ? "Mã truy cập sai cú pháp"
          : error}
      </h2>
    </div>
  ) : (
    <div className="hierarchy-viewer">
      <div style={{ height: "100vh", width: "100vw" }}>
        <TransformWrapper
          minScale={0.1}
          maxScale={2}
          wheel={{ disabled: false }}
          doubleClick={{ disabled: false }}
          panning={{ disabled: false }}
        >
          <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
            <ReactHiererchyChart
              nodes={nodes}
              direction="vertical"
              randerNode={(node) => {
                return (
                  <div className={`node-template level${node.level}`}>
                    <strong>{node.name}</strong>
                    {(node.primary_department || node.head_department) && (
                      <div style={{ textAlign: "left", padding: "0.5rem" }}>
                        <div>Cấp bộ phận: {node.primary_department ? "✅" : "❌"}</div>
                        <div>Cấp đơn vị: {node.head_department ? "✅" : "❌"}</div>
                        {node.approve_manager.length > 0 && (
                          <Space wrap={true}>
                            <span style={{ padding: 0 }}>Quản lý:</span>
                            <Space wrap={true}>
                              {node.approve_manager
                                .filter((i) => employeeList.find((item) => item.id === i))
                                .map((item) => {
                                  const list = employeeList;
                                  const managerName = list.find((i) => i.id === item);
                                  return (
                                    <Tag style={{ padding: 5, margin: 0 }}>
                                      {managerName?.name[1] || "Không xác định"}
                                    </Tag>
                                  );
                                })}
                            </Space>
                          </Space>
                        )}
                      </div>
                    )}
                  </div>
                );
              }}
            />
          </TransformComponent>
        </TransformWrapper>
      </div>
    </div>
  );
}
export default App;
