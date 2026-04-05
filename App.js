import { createClient } from "@supabase/supabase-js";
import { useState, useEffect } from "react";

const supabaseUrl = "https://mqqhdrzyxstohxysxzmj.supabase.co";
const supabaseAnonKey = "sb_publishable_EpzkiTDGyffFuA07OEORjg_WpjYs_gN";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function App() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [userName, setUserName] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Check for saved user on load
  useEffect(() => {
    const savedUser = localStorage.getItem("social_user");
    if (savedUser) {
      setUserName(savedUser);
      setIsLoggedIn(true);
    }
    fetchPosts();
  }, []);

  async function fetchPosts() {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      const { data: likesData, error: likesError } = await supabase
        .from("likes")
        .select("*");

      if (likesError) throw likesError;

      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("*")
        .order("created_at", { ascending: true });

      if (commentsError) throw commentsError;

      const postsWithDetails = postsData.map((post) => ({
        ...post,
        likes: likesData.filter((like) => like.post_id === post.id),
        comments: commentsData.filter((comment) => comment.post_id === post.id),
      }));

      setPosts(postsWithDetails);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleLogin() {
    if (!userName.trim()) {
      setMessage("Please enter a username");
      return;
    }
    localStorage.setItem("social_user", userName);
    setIsLoggedIn(true);
    setMessage(`Welcome, ${userName}!`);
    setTimeout(() => setMessage(""), 2000);
  }

  function handleLogout() {
    localStorage.removeItem("social_user");
    setUserName("");
    setIsLoggedIn(false);
    setMessage("Logged out");
    setTimeout(() => setMessage(""), 2000);
  }

  async function addPost(e) {
    e.preventDefault();
    if (!isLoggedIn) {
      setMessage("Please login first!");
      setTimeout(() => setMessage(""), 2000);
      return;
    }
    if (!newPost.trim()) return;

    try {
      const { data, error } = await supabase
        .from("posts")
        .insert([{ content: newPost, user_name: userName }])
        .select();

      if (error) throw error;

      const newPostWithDetails = {
        ...data[0],
        likes: [],
        comments: [],
      };

      setPosts([newPostWithDetails, ...posts]);
      setNewPost("");
    } catch (error) {
      alert("Error adding post: " + error.message);
    }
  }

  async function updatePost(postId, newContent) {
    if (!newContent.trim()) return;

    try {
      const { error } = await supabase
        .from("posts")
        .update({ content: newContent, updated_at: new Date().toISOString() })
        .eq("id", postId);

      if (error) throw error;

      setPosts(
        posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                content: newContent,
                updated_at: new Date().toISOString(),
              }
            : post
        )
      );
    } catch (error) {
      alert("Error updating post: " + error.message);
    }
  }

  async function toggleLike(postId) {
    if (!isLoggedIn) {
      setMessage("Please login to like!");
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    const post = posts.find((p) => p.id === postId);

    // RULE: Cannot like your own post
    if (post.user_name === userName) {
      setMessage("😂 You can't like your own post!");
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    const alreadyLiked = post?.likes.some(
      (like) => like.user_name === userName
    );

    try {
      if (alreadyLiked) {
        await supabase
          .from("likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_name", userName);
      } else {
        await supabase
          .from("likes")
          .insert([{ post_id: postId, user_name: userName }]);
      }

      await fetchPosts();
    } catch (error) {
      alert("Error: " + error.message);
    }
  }

  async function addComment(postId, commentContent) {
    if (!isLoggedIn) {
      setMessage("Please login to comment!");
      setTimeout(() => setMessage(""), 2000);
      return;
    }
    if (!commentContent.trim()) return;

    const post = posts.find((p) => p.id === postId);

    // RULE: Cannot comment on your own post
    if (post.user_name === userName) {
      setMessage("😂 You can't comment on your own post!");
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    try {
      const { error } = await supabase.from("comments").insert([
        {
          post_id: postId,
          user_name: userName,
          content: commentContent,
        },
      ]);

      if (error) throw error;

      await fetchPosts();
    } catch (error) {
      alert("Error: " + error.message);
    }
  }

  async function deletePost(postId) {
    if (!isLoggedIn) return;

    const post = posts.find((p) => p.id === postId);
    if (post.user_name !== userName) {
      setMessage("You can only delete your own posts!");
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    if (!confirm("Delete this post?")) return;

    try {
      await supabase.from("likes").delete().eq("post_id", postId);
      await supabase.from("comments").delete().eq("post_id", postId);

      const { error } = await supabase.from("posts").delete().eq("id", postId);

      if (error) throw error;

      setPosts(posts.filter((post) => post.id !== postId));
    } catch (error) {
      alert("Error: " + error.message);
    }
  }

  if (loading)
    return (
      <h2 style={{ textAlign: "center", marginTop: "50px" }}>📱 Loading...</h2>
    );

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ textAlign: "center" }}>🐦 Mini Social</h1>

      {/* Login Section */}
      <div
        style={{
          backgroundColor: "#f0f2f5",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "20px",
          textAlign: "center",
        }}
      >
        {!isLoggedIn ? (
          <div>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your username"
              style={{
                padding: "10px",
                width: "60%",
                borderRadius: "8px",
                border: "1px solid #ddd",
                marginRight: "10px",
              }}
            />
            <button
              onClick={handleLogin}
              style={{
                padding: "10px 20px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Login
            </button>
          </div>
        ) : (
          <div>
            <span style={{ marginRight: "15px" }}>
              ✅ Logged in as: <strong>{userName}</strong>
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: "5px 15px",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        )}
        {message && (
          <p style={{ marginTop: "10px", color: "#1da1f2" }}>{message}</p>
        )}
      </div>

      {/* New Post Form */}
      {isLoggedIn && (
        <form onSubmit={addPost} style={{ marginBottom: "20px" }}>
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="What's on your mind?"
            rows="3"
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          />
          <button
            type="submit"
            style={{
              marginTop: "10px",
              padding: "10px 20px",
              backgroundColor: "#1da1f2",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Post 📝
          </button>
        </form>
      )}

      {/* Posts Feed */}
      <div>
        {posts.length === 0 ? (
          <p style={{ textAlign: "center", color: "#888" }}>
            No posts yet. Be the first! 🎉
          </p>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={userName}
              isLoggedIn={isLoggedIn}
              onLike={toggleLike}
              onComment={addComment}
              onDelete={deletePost}
              onUpdate={updatePost}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PostCard({
  post,
  currentUser,
  isLoggedIn,
  onLike,
  onComment,
  onDelete,
  onUpdate,
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post.content);

  const isOwner = post.user_name === currentUser;
  const likeCount = post.likes?.length || 0;
  const userLiked =
    post.likes?.some((like) => like.user_name === currentUser) || false;
  const commentCount = post.comments?.length || 0;

  function handleAddComment(e) {
    e.preventDefault();
    onComment(post.id, commentText);
    setCommentText("");
  }

  function handleSaveEdit() {
    if (editText.trim() && editText !== post.content) {
      onUpdate(post.id, editText);
    }
    setIsEditing(false);
  }

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "15px",
        marginBottom: "15px",
        backgroundColor: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <strong style={{ color: "#1da1f2" }}>@{post.user_name}</strong>
        {isOwner && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                backgroundColor: "#ffc107",
                color: "#333",
                border: "none",
                borderRadius: "4px",
                padding: "4px 8px",
                cursor: "pointer",
              }}
            >
              Edit ✏️
            </button>
            <button
              onClick={() => onDelete(post.id)}
              style={{
                backgroundColor: "#ff4444",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "4px 8px",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div style={{ margin: "10px 0" }}>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows="3"
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "8px",
              border: "1px solid #1da1f2",
            }}
            autoFocus
          />
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button
              onClick={handleSaveEdit}
              style={{
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              Save 💾
            </button>
            <button
              onClick={() => setIsEditing(false)}
              style={{
                backgroundColor: "#888",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p style={{ margin: "10px 0" }}>{post.content}</p>
      )}

      {!isEditing && (
        <>
          <small
            style={{ color: "#888", display: "block", marginBottom: "12px" }}
          >
            {new Date(post.created_at).toLocaleString()}
            {post.updated_at &&
              post.updated_at !== post.created_at &&
              " (edited)"}
          </small>

          <div
            style={{
              display: "flex",
              gap: "20px",
              marginBottom: "12px",
              borderTop: "1px solid #eee",
              paddingTop: "10px",
            }}
          >
            <button
              onClick={() => onLike(post.id)}
              disabled={!isLoggedIn || isOwner}
              style={{
                backgroundColor: "transparent",
                border: "none",
                cursor: isLoggedIn && !isOwner ? "pointer" : "not-allowed",
                color: userLiked ? "#ff4444" : "#888",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                opacity: !isLoggedIn || isOwner ? 0.5 : 1,
              }}
            >
              {userLiked ? "❤️" : "🤍"} {likeCount}
            </button>

            <button
              onClick={() => setShowComments(!showComments)}
              disabled={!isLoggedIn || isOwner}
              style={{
                backgroundColor: "transparent",
                border: "none",
                cursor: isLoggedIn && !isOwner ? "pointer" : "not-allowed",
                color: "#888",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                opacity: !isLoggedIn || isOwner ? 0.5 : 1,
              }}
            >
              💬 {commentCount}
            </button>
          </div>

          {showComments && !isOwner && (
            <div
              style={{
                marginTop: "12px",
                paddingTop: "12px",
                borderTop: "1px solid #eee",
              }}
            >
              <form
                onSubmit={handleAddComment}
                style={{ display: "flex", gap: "8px", marginBottom: "12px" }}
              >
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "#1da1f2",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  Post
                </button>
              </form>

              {post.comments?.length === 0 ? (
                <p
                  style={{
                    color: "#888",
                    fontSize: "14px",
                    textAlign: "center",
                  }}
                >
                  No comments yet. Be the first! 💬
                </p>
              ) : (
                post.comments?.map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      backgroundColor: "#f9f9f9",
                      padding: "8px",
                      borderRadius: "8px",
                      marginBottom: "8px",
                    }}
                  >
                    <strong style={{ color: "#1da1f2", fontSize: "13px" }}>
                      @{comment.user_name}
                    </strong>
                    <p style={{ margin: "4px 0 0 0", fontSize: "14px" }}>
                      {comment.content}
                    </p>
                    <small style={{ color: "#888", fontSize: "10px" }}>
                      {new Date(comment.created_at).toLocaleString()}
                    </small>
                  </div>
                ))
              )}
            </div>
          )}

          {showComments && isOwner && (
            <div
              style={{
                marginTop: "12px",
                padding: "10px",
                backgroundColor: "#f0f2f5",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <small style={{ color: "#888" }}>
                💬 You cannot comment on your own posts
              </small>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
