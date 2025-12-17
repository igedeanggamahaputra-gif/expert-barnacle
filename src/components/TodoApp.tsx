import { useState, useEffect } from "react";
import type { FormEvent, ChangeEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Database } from "../types/database.types";

type Todo = Database["public"]["Tables"]["todos"]["Row"];

// Props interface - defines what this component expects
interface TodoAppProps {
  session: Session;
}

export default function TodoApp({ session }: TodoAppProps) {
  const [tasks, setTasks] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Load tasks when component mounts
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async (): Promise<void> => {
    try {
      setError("");
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    const trimmedTask = newTask.trim();
    if (!trimmedTask) return;

    try {
      setError("");
      const { data, error } = await supabase
        .from("todos")
        .insert([
          {
            task: trimmedTask,
            user_id: session.user.id,
            completed: false,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Add new task to the beginning of the list
      if (data) {
        setTasks([data, ...tasks]);
        setNewTask("");
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      }
    }
  };

  const toggleTask = async (
    id: number,
    currentCompleted: boolean
  ): Promise<void> => {
    try {
      setError("");
      const { error } = await supabase
        .from("todos")
        .update({ completed: !currentCompleted })
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setTasks(
        tasks.map((task) =>
          task.id === id ? { ...task, completed: !currentCompleted } : task
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      }
    }
  };

  const deleteTask = async (id: number): Promise<void> => {
    // Optimistically remove from UI
    const originalTasks = [...tasks];
    setTasks(tasks.filter((task) => task.id !== id));

    try {
      setError("");
      const { error } = await supabase.from("todos").delete().eq("id", id);

      if (error) throw error;
    } catch (error) {
      // Restore tasks on error
      setTasks(originalTasks);
      if (error instanceof Error) {
        setError(error.message);
      }
    }
  };

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setNewTask(e.target.value);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-2xl text-white font-semibold">
          Loading your tasks...
        </div>
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const completionPercentage =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pt-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">✅ My Tasks</h1>
            <div className="flex items-center gap-4">
              <p className="text-white/90">
                {completedCount} of {totalCount} completed
              </p>
              {totalCount > 0 && (
                <div className="bg-white/20 rounded-full px-3 py-1">
                  <span className="text-white font-semibold">
                    {completionPercentage.toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={signOut}
            className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition"
          >
            Sign Out
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="mb-6 bg-white/20 rounded-full h-3 overflow-hidden">
            <div
              className="bg-green-400 h-full transition-all duration-500 ease-out"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        )}

        {/* Add Task Form */}
        <form onSubmit={addTask} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTask}
              onChange={handleInputChange}
              placeholder="What do you need to do?"
              className="flex-1 px-4 py-3 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <button
              type="submit"
              className="bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition"
            >
              Add
            </button>
          </div>
        </form>

        {/* Task List */}
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-12 text-center text-white">
              <p className="text-2xl mb-2">🎯</p>
              <p className="text-xl font-semibold mb-2">No tasks yet!</p>
              <p className="text-white/80">
                Add your first task above to get started
              </p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-lg p-4 shadow-lg flex items-center gap-4 hover:shadow-xl transition group"
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTask(task.id, task.completed)}
                  className="w-6 h-6 cursor-pointer accent-purple-600"
                />
                <span
                  className={`flex-1 text-lg ${
                    task.completed
                      ? "line-through text-gray-400"
                      : "text-gray-800"
                  }`}
                >
                  {task.task}
                </span>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                  aria-label="Delete task"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Stats footer */}
        {totalCount > 0 && (
          <div className="mt-8 text-center text-white/80">
            <p className="text-sm">
              {completedCount === totalCount
                ? "🎉 All tasks completed! Great job!"
                : `Keep going! ${totalCount - completedCount} task${
                    totalCount - completedCount !== 1 ? "s" : ""
                  } remaining`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
