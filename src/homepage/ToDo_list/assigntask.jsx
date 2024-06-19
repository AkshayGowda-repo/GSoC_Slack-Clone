import supabase from "../../supabase";
import assigntaskCSS from "./assigntask.module.css";
import { Allconvers } from "../../context api/context";
import { Channelcontext } from "../../context api/channelcontext";
import { useContext, useState, useEffect } from "react";
import { ImCross } from "react-icons/im";
import {
  fetchchannelmember,
  Getuserdetails,
  fetchchanneltodo,
  fetchusertodo,
} from "../../database.jsx"; // Import your utility functions
import { v4 as uuid } from "uuid";

const Assigntask = () => {
  const { setAssigntask, currentUser } = useContext(Allconvers);
  const { channel_data } = useContext(Channelcontext);
  const [assignToMember, setAssignToMember] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState(null); // State to store selected member ID
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [taskName, setTaskName] = useState("");
  const [dueDateTime, setDueDateTime] = useState("");
  const [noDueDate, setNoDueDate] = useState(false); // State to track if "No Due Date" option is selected
  const [taskDescription, setTaskDescription] = useState("");
  const [fetchdone, setFetchDone] = useState(false);
  const [members, setMembers] = useState([]);
  const [user_todo, setUserTodo] = useState([]);
  const [channel_todo, setChannelTodo] = useState([]);

  // Notification states
  const [showNotification, setShowNotification] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  if (channel_data?.channel_id) {
    useEffect(() => {
      const fetchUserTodoList = async () => {
        const receivedUserTodo = await fetchusertodo(selectedMemberId);
        setUserTodo(receivedUserTodo);
      };
      fetchUserTodoList();
    }, [selectedMemberId]);

    useEffect(() => {
      const fetchChannelTodoList = async () => {
        const receivedChannelTodo = await fetchchanneltodo(
          channel_data.channel_id
        );
        setChannelTodo(receivedChannelTodo);
      };
      fetchChannelTodoList();
    }, [channel_data]);

    // Function to handle search query change
    const handleSearchChange = async (e) => {
      setSearchQuery(e.target.value);
      setFetchDone(false);
      const currentmembers = await fetchchannelmember(channel_data.channel_id);
      const currentmems = currentmembers[0].channel_members;
      const matchedMembers = currentmems.filter((currentmem) =>
        currentmem.member_name
          .toLowerCase()
          .includes(e.target.value.toLowerCase())
      );
      const detailedMembers = await Promise.all(
        matchedMembers.map(async (member) => {
          try {
            const memberDetails = await Getuserdetails(member.member_id);
            return memberDetails;
          } catch (error) {
            console.error(error);
            return null;
          }
        })
      );
      setMembers(detailedMembers.filter(Boolean));
      setFetchDone(true);
    };

    // Function to handle form submission
    // Function to handle form submission
    const handleSubmit = async () => {
      try {
        // Check if required fields are filled
        if (
          !taskName ||
          (!assignToMember && channel_todo.length === 0) ||
          (assignToMember && !selectedMemberId) ||
          (!noDueDate && !dueDateTime) ||
          !taskDescription
        ) {
          setShowNotification(true);
          // Hide notification after 2.5 seconds
          setTimeout(() => {
            setShowNotification(false);
          }, 2500);
          return;
        }

        const assignedOn = new Date().toISOString(); // Current timestamp
        const task_id = uuid(); // Generate a random UUID

        let todoListData = {};

        if (!assignToMember) {
          todoListData = [
            ...channel_todo,
            {
              task_id,
              taskname: taskName,
              duedate: noDueDate ? null : dueDateTime || null,
              assignedon: assignedOn,
              task_description: taskDescription,
              taskdone: false,
              assigned_by: currentUser[0].username,
              assigned_byid: currentUser[0].id,
            },
          ];

          await supabase
            .from("Channel_todolist")
            .update({ todo_list: todoListData })
            .eq("id", channel_data.channel_id);
        } else {
          todoListData = [
            ...user_todo,
            {
              task_id,
              taskname: taskName,
              duedate: noDueDate ? null : dueDateTime || null,
              assignedon: assignedOn,
              task_description: taskDescription,
              taskdone: false,
              assigned_by: currentUser[0].username,
              assigned_byid: currentUser[0].id,
            },
          ];

          await supabase
            .from("Todo_list")
            .update({ todo_list: todoListData })
            .eq("id", selectedMemberId);
        }

        // Clear input fields and reset states after successful submission
        setTaskName("");
        setDueDateTime("");
        setNoDueDate(false);
        setTaskDescription("");
        setSelectedMemberId(null);
        setShowSuccessNotification(true);

        // Hide success notification after 3 seconds
        setTimeout(() => {
          setShowSuccessNotification(false);
        }, 3000);

        // Reset search query and member list
        setSearchQuery("");
        setMembers([]);
        setFetchDone(false);
      } catch (error) {
        console.error("Error assigning task:", error.message);
      }
    };

    return (
      <div className={assigntaskCSS.body}>
        <div className={assigntaskCSS.box}>
          <ImCross
            size={16}
            onClick={() => {
              setAssigntask(false);
            }}
            className={assigntaskCSS.closeIcon}
          />
          <div className={assigntaskCSS.head}>
            <h1>Assign a Task</h1>
          </div>
          <div className={assigntaskCSS.assignTo}>
            <div className={assigntaskCSS.checkboxes}>
              <label>
                <input
                  type="checkbox"
                  checked={assignToMember}
                  onChange={() => {
                    setAssignToMember(true);
                    setSelectedMemberId(null); // Reset selected member when switching to Everyone
                  }}
                  style={{ cursor: "pointer" }}
                />
                Assign to Member
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={!assignToMember}
                  onChange={() => {
                    setAssignToMember(false);
                    setNoDueDate(false); // Reset "No Due Date" option when switching to Everyone
                    setDueDateTime(""); // Reset due date when switching to Everyone
                  }}
                  style={{ cursor: "pointer" }}
                />
                Assign to Everyone
              </label>
            </div>

            {assignToMember && (
              <div className={assigntaskCSS.searchBox}>
                <input
                  type="text"
                  placeholder="Search for a member..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
                <div className={assigntaskCSS.searchResults}>
                  {fetchdone && members.length > 0 ? (
                    members.map((member) => (
                      <div
                        key={member[0]?.id}
                        className={assigntaskCSS.member}
                        onClick={() => setSelectedMemberId(member[0]?.id)}
                      >
                        {member ? (
                          <>
                            <img
                              src={member[0]?.avatar_url}
                              alt={member[0]?.username}
                              className={assigntaskCSS.memimg}
                            />
                            <div className={assigntaskCSS.meminfo}>
                              <span className={assigntaskCSS.infospan1}>
                                {member[0]?.username}
                              </span>
                              <span className={assigntaskCSS.infospan2}>
                                {member[0]?.email}
                              </span>
                              {selectedMemberId === member[0]?.id && (
                                <span
                                  className={assigntaskCSS.selectionIndicator}
                                >
                                  Selected
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <></>
                        )}
                      </div>
                    ))
                  ) : (
                    <></>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className={assigntaskCSS.taskName}>
            <label>Task Name:</label>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              required // Ensure task name is compulsory
            />
            <span className={assigntaskCSS.requiredLabel}>* Required</span>
          </div>
          <div className={assigntaskCSS.dueDateTime}>
            <label>Due Date and Time:</label>
            <div className={assigntaskCSS.dueDateTimeOptions}>
              <input
                type="datetime-local"
                value={dueDateTime}
                onChange={(e) => {
                  setDueDateTime(e.target.value);
                  setNoDueDate(false); // Ensure "No Due Date" is unchecked when a due date is selected
                }}
              />
              <label>
                <input
                  type="checkbox"
                  checked={noDueDate}
                  onChange={(e) => {
                    setNoDueDate(e.target.checked);
                    if (e.target.checked) {
                      setDueDateTime(""); // Reset due date when "No Due Date" is checked
                    }
                  }}
                  style={{ cursor: "pointer", marginLeft: "10px" }}
                />
                No Due Date
              </label>
            </div>
            <span className={assigntaskCSS.requiredLabel}>* Required</span>
          </div>
          <div className={assigntaskCSS.taskDescription}>
            <label>Task Description:</label>
            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
            />
            <span className={assigntaskCSS.requiredLabel}>* Required</span>
          </div>
          <div className={assigntaskCSS.submitButton}>
            <button onClick={handleSubmit}>Assign</button>
          </div>
          {showNotification && (
            <div className={assigntaskCSS.notification}>
              {assignToMember
                ? "Please select a member to assign the task and fill required details."
                : "Please fill all required details."}
            </div>
          )}

          {showSuccessNotification && (
            <div className={assigntaskCSS.notification}>
              Task assigned successfully!
            </div>
          )}
        </div>
      </div>
    );
  } else {
    return <></>;
  }
};

export default Assigntask;
