import { useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Camera, Copy, ExternalLink, Feather, ImagePlus, Link2, LogIn, LogOut, Mail, MessageCircle, Plus, Search, Send, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { archiveKey, archiveLabel, filterPostsByArchive } from "@/lib/blog";
import { editorCommands, normalizeEditorUrl } from "@/lib/editor";
import { searchPosts, shareUrls, visiblePosts } from "@/lib/discovery";

const formatDate = (value: Date | string) => new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
const todayInput = () => new Date().toISOString().slice(0, 10);

type DraftPhoto = { name: string; type: string; data: string; preview: string };

function SiteHeader({ onStudio, onLogin }: { onStudio: () => void; onLogin: () => void }) {
  const { user, isAuthenticated, logout } = useAuth();
  return <header className="site-header">
    <a href="/" className="brand" aria-label="Paper and Ash Diary home"><span className="brand-mark"><Feather size={19} /></span><span><strong>Paper & Ash</strong><em>field notes from the in-between</em></span></a>
    <nav className="header-actions">
      <a href="#archive" className="text-link">Archive</a>
      {user?.role === "admin" && <button className="ink-button small" onClick={onStudio}><Plus size={15} /> New entry</button>}
      {isAuthenticated ? <button className="icon-link" onClick={() => logout()} title="Sign out"><LogOut size={17} /></button> : <button className="text-link login-link" onClick={onLogin}><LogIn size={16} /> Owner sign in</button>}
    </nav>
  </header>;
}

function Login({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const { login, loginPending } = useAuth();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try { await login(email, password); toast.success("Welcome back."); onClose(); }
    catch { toast.error("Incorrect email or password."); }
  };
  return <div className="studio-overlay" onClick={onClose}><section className="studio-panel" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}><div className="studio-top"><div><p className="eyebrow">Owner studio</p><h2>Sign in.</h2></div><button className="close-button" onClick={onClose} aria-label="Close login">×</button></div><form className="editor-main" style={{ paddingTop: 30 }} onSubmit={submit}><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus placeholder="you@example.com" /></label><label style={{ marginTop: 19, display: "block" }}>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" /></label><button className="ink-button publish-button" disabled={loginPending} type="submit">{loginPending ? "Signing in…" : "Sign in"}<LogIn size={15} /></button></form></section></div>;
}

function Feed({ onStudio }: { onStudio: () => void }) {
  const { user } = useAuth();
  const { data: posts, isLoading } = trpc.blog.list.useQuery();
  const [archiveFilter, setArchiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(6);
  const archiveGroups = useMemo(() => {
    const groups = new Map<string, { year: string; month: string; count: number }>();
    (posts ?? []).forEach(post => { const key = archiveKey(post.publishedAt); const current = groups.get(key); const label = archiveLabel(post.publishedAt); groups.set(key, { ...label, count: (current?.count ?? 0) + 1 }); });
    return Array.from(groups.entries());
  }, [posts]);
  const filteredPosts = useMemo(() => searchPosts(filterPostsByArchive(posts ?? [], archiveFilter), searchQuery), [posts, archiveFilter, searchQuery]);
  const visibleFeedPosts = useMemo(() => visiblePosts(filteredPosts, visibleCount), [filteredPosts, visibleCount]);
  return <>
    <section className="masthead">
      <div className="masthead-copy"><p className="eyebrow">A daily record · est. 2026</p><h1>Small things,<br /><span>left unsaid.</span></h1><p className="dek">A loose-leaf diary of ordinary days, borrowed light, half-finished thoughts, and whatever found its way onto the page.</p><div className="rule-note"><span>✳</span> written slowly, kept forever</div></div>
      <div className="masthead-art" aria-hidden="true"><div className="sun-disc" /><div className="stamp">VOL.<br /><b>01</b><br />NOTES</div><div className="scribble">stay<br />curious</div></div>
    </section>
    <section id="archive" className="archive-section"><div className="section-heading"><div><p className="eyebrow">The archive</p><h2>Recent entries</h2></div><span className="count-label">{posts?.length ?? 0} scraps collected</span></div>
      {isLoading ? <div className="empty-state">Dusting off the archive…</div> : posts?.length ? <div className="archive-layout"><aside className="archive-sidebar"><p className="eyebrow">Find a page</p><div className="archive-search"><Search size={15} /><input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setVisibleCount(6); }} placeholder="Search the diary" aria-label="Search blog posts" /></div><p className="eyebrow archive-date-label">Browse by date</p><button className={`archive-filter ${archiveFilter === "all" ? "active" : ""}`} onClick={() => setArchiveFilter("all")}>All entries <span>{posts.length}</span></button>{archiveGroups.map(([key, group]) => <button key={key} className={`archive-filter ${archiveFilter === key ? "active" : ""}`} onClick={() => setArchiveFilter(key)}><span>{group.month}</span> <small>{group.year}</small><b>{group.count}</b></button>)}</aside><div className="post-grid">{visibleFeedPosts.map((post, index) => <article className={`post-card ${index === 0 ? "featured" : ""}`} key={post.id}><a href={`/post/${post.slug}`} className="card-image-wrap">{post.photos[0] ? <img src={post.photos[0].url} alt={post.photos[0].altText || post.title} /> : <div className="placeholder-photo"><Camera size={27} /><span>no photograph<br />attached</span></div>}<span className="card-number">{String(index + 1).padStart(2, "0")}</span></a><div className="card-body"><p className="post-date">{formatDate(post.publishedAt)}</p><h3><a href={`/post/${post.slug}`}>{post.title}</a></h3><p className="excerpt">{post.excerpt}</p><a href={`/post/${post.slug}`} className="read-link">Read the entry <span>↗</span></a></div></article>)}</div>{visibleFeedPosts.length < filteredPosts.length && <button className="load-more" onClick={() => setVisibleCount(count => count + 6)}>Load more entries <span>↓</span></button>}</div> : <div className="empty-state"><Feather size={28} /><p>No entries yet. The first page is waiting to be written.</p>{user?.role === "admin" && <button className="ink-button" onClick={onStudio}><Plus size={16} /> Write the first entry</button>}</div>}
    </section>
    <footer className="site-footer"><span>Paper & Ash Diary</span><span>made of days &amp; dust</span><span>✳</span></footer>
  </>;
}

function Studio({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [date, setDate] = useState(todayInput()); const [photos, setPhotos] = useState<DraftPhoto[]>([]); const inputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const create = trpc.blog.create.useMutation({ onSuccess: (result) => { toast.success("Entry pressed into the archive."); utils.blog.list.invalidate(); onClose(); window.location.href = `/post/${result.slug}`; }, onError: (error) => toast.error(error.message) });
  const remove = trpc.blog.remove.useMutation({ onSuccess: () => { toast.success("Entry removed."); utils.blog.list.invalidate(); }, onError: e => toast.error(e.message) });
  const { data: posts } = trpc.blog.list.useQuery();
  const { user } = useAuth();
  const { data: moderation } = trpc.blog.moderation.useQuery(undefined, { enabled: user?.role === "admin" });
  const approveComment = trpc.blog.setCommentApproval.useMutation({ onSuccess: () => utils.blog.moderation.invalidate(), onError: e => toast.error(e.message) });
  const deleteComment = trpc.blog.deleteComment.useMutation({ onSuccess: () => { utils.blog.moderation.invalidate(); toast.success("The note was removed."); }, onError: e => toast.error(e.message) });
  const addLink = () => { const url = normalizeEditorUrl(prompt("Paste the link address") || ""); if (url) document.execCommand(editorCommands.link, false, url); };
  const onFiles = async (files: FileList | null) => { if (!files) return; const picked = await Promise.all(Array.from(files).slice(0, 8).map(file => new Promise<DraftPhoto>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ name: file.name, type: file.type, data: String(reader.result), preview: String(reader.result) }); reader.onerror = reject; reader.readAsDataURL(file); }))); setPhotos(current => [...current, ...picked].slice(0, 8)); };
  return <div className="studio-overlay"><section className="studio-panel"><div className="studio-top"><div><p className="eyebrow">Owner studio</p><h2>Make a new mark.</h2></div><button className="close-button" onClick={onClose} aria-label="Close studio">×</button></div><div className="editor-layout"><div className="editor-main"><label>Title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Something worth remembering" /></label><label>Date<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label><label>Entry <span className="label-hint">Use the little toolbar to shape the page.</span><div className="editor-toolbar"><button type="button" onClick={() => document.execCommand(editorCommands.bold)}><b>B</b></button><button type="button" onClick={() => document.execCommand(editorCommands.italic)}><i>I</i></button><button type="button" onClick={() => document.execCommand("formatBlock", false, "blockquote")}>❝</button><button type="button" onClick={() => document.execCommand("insertUnorderedList")}>&bull; list</button><button type="button" onClick={addLink} title="Add hyperlink">↗ link</button></div><div className="rich-editor" contentEditable suppressContentEditableWarning onInput={e => setBody(e.currentTarget.innerHTML)} data-placeholder="Begin anywhere…" /></label></div><aside className="editor-side"><div className="photo-drop" onClick={() => inputRef.current?.click()}><ImagePlus size={27} /><strong>Attach photographs</strong><span>up to 8 images · 8MB each</span><input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={e => onFiles(e.target.files)} /></div>{photos.length > 0 && <div className="photo-strip">{photos.map((photo, i) => <div className="photo-thumb" key={`${photo.name}-${i}`}><img src={photo.preview} alt="" /><button type="button" onClick={() => setPhotos(current => current.filter((_, index) => index !== i))}>×</button></div>)}</div>}<button className="ink-button publish-button" disabled={create.isPending || !title.trim() || !body.trim()} onClick={() => create.mutate({ title, body, publishedAt: new Date(`${date}T12:00:00`).toISOString(), photos })}>{create.isPending ? "Pressing…" : "Publish entry"}<Send size={15} /></button></aside></div><div className="studio-divider" /><div className="manage-list"><p className="eyebrow">Manage the archive</p>{posts?.map(post => <div className="manage-row" key={post.id}><span>{post.title}<small>{formatDate(post.publishedAt)}</small></span><button className="danger-link" onClick={() => { if (confirm("Remove this entry from the archive?")) remove.mutate({ id: post.id }); }}><Trash2 size={15} /> remove</button></div>)}</div><div className="studio-divider" /><div className="moderation-section"><div className="moderation-heading"><div><p className="eyebrow">Reader notes</p><h3>Comment moderation</h3></div><span className="count-label">{moderation?.filter(comment => !comment.approved).length ?? 0} waiting</span></div>{moderation?.length ? <div className="moderation-list">{moderation.map(comment => <div className={`moderation-row ${comment.approved ? "approved" : "pending"}`} key={comment.id}><div><strong>{comment.authorName}</strong><small>{formatDate(comment.createdAt)} · {comment.approved ? "approved" : "awaiting approval"}</small><p>{comment.body}</p></div><div className="moderation-actions">{!comment.approved && <button className="approve-link" onClick={() => approveComment.mutate({ id: comment.id, approved: true })}>approve</button>}<button className="danger-link" onClick={() => deleteComment.mutate({ id: comment.id })}><Trash2 size={14} /> delete</button></div></div>)}</div> : <div className="moderation-empty">No reader notes have arrived yet.</div>}</div></section></div>;
}

function PostDetail({ slug, onBack }: { slug: string; onBack: () => void }) {
  const [shareMessage, setShareMessage] = useState("");
  const { data: post, isLoading } = trpc.blog.bySlug.useQuery({ slug });
  const [name, setName] = useState(""); const [body, setBody] = useState(""); const utils = trpc.useUtils();
  const comment = trpc.blog.addComment.useMutation({ onSuccess: () => { setName(""); setBody(""); utils.blog.bySlug.invalidate({ slug }); toast.success("Your note is waiting in the margins for approval."); }, onError: e => toast.error(e.message) });
  const shareUrl = typeof window === "undefined" ? "" : window.location.href;
  const shareLinks = post ? shareUrls(shareUrl, post.title) : shareUrls(shareUrl, "Paper & Ash Diary");
  const copyShareLink = async () => { await navigator.clipboard?.writeText(shareUrl); setShareMessage("link copied"); setTimeout(() => setShareMessage(""), 1800); };
  const nativeShare = async () => { if (navigator.share && post) await navigator.share({ title: post.title, text: post.excerpt, url: shareUrl }); else await copyShareLink(); };
  if (isLoading) return <div className="detail-page"><div className="empty-state">Finding that page…</div></div>;
  if (!post) return <div className="detail-page"><div className="empty-state"><p>That page seems to have blown away in the wind.</p><button className="ink-button" onClick={onBack}><ArrowLeft size={15} /> Back to archive</button></div></div>;
  return <div className="detail-page"><button className="back-link" onClick={onBack}><ArrowLeft size={16} /> back to archive</button><article className="detail-article"><div className="detail-kicker"><span>{formatDate(post.publishedAt)}</span><span>{post.photos.length} photograph{post.photos.length === 1 ? "" : "s"}</span></div><h1>{post.title}</h1><div className="detail-rule" /><div className="share-bar"><span><Share2 size={15} /> share this page</span><div className="share-actions"><button onClick={nativeShare} title="Share entry"><Share2 size={14} /> share</button><button onClick={copyShareLink} title="Copy link"><Copy size={14} /> {shareMessage || "copy link"}</button><a href={shareLinks.x} target="_blank" rel="noreferrer" title="Share on X">X</a><a href={shareLinks.facebook} target="_blank" rel="noreferrer" title="Share on Facebook"><ExternalLink size={13} /></a><a href={shareLinks.email} title="Share by email"><Mail size={14} /></a></div></div><div className="detail-content" dangerouslySetInnerHTML={{ __html: post.body }} />{post.photos.length > 0 && <div className="detail-gallery">{post.photos.map(photo => <figure key={photo.id}><img src={photo.url} alt={photo.altText || post.title} /><figcaption>{photo.altText || "from the day"}</figcaption></figure>)}</div>}<section className="comments"><div className="comments-heading"><div><p className="eyebrow">The margins</p><h2>Notes from readers</h2></div><span><MessageCircle size={16} /> {post.comments.length}</span></div>{post.comments.length > 0 && <div className="comment-list">{post.comments.map(item => <div className="comment" key={item.id}><div className="comment-meta"><strong>{item.authorName}</strong><time>{formatDate(item.createdAt)}</time></div><p>{item.body}</p></div>)}</div>}<form className="comment-form" onSubmit={e => { e.preventDefault(); if (!post) return; comment.mutate({ postId: post.id, authorName: name, body }); }}><div className="form-row"><label>Your name<input value={name} onChange={e => setName(e.target.value)} maxLength={100} required placeholder="A friendly stranger" /></label><label>Leave a note<textarea value={body} onChange={e => setBody(e.target.value)} maxLength={2000} required placeholder="Write something in the margins…" rows={3} /></label></div><p className="label-hint">Notes are reviewed before they join the page.</p><button className="ink-button" disabled={comment.isPending}>{comment.isPending ? "Sending…" : "Leave your note"}<Send size={15} /></button></form></section></article></div>;
}

export default function Home() {
  const [, setLocation] = useLocation(); const [studio, setStudio] = useState(false); const [login, setLogin] = useState(false); const [match, params] = useRoute("/post/:slug");
  const detail = useMemo(() => match ? params?.slug : null, [match, params?.slug]);
  return <div className="app-shell"><SiteHeader onStudio={() => setStudio(true)} onLogin={() => setLogin(true)} />{detail ? <PostDetail slug={detail} onBack={() => setLocation("/")} /> : <Feed onStudio={() => setStudio(true)} />}{studio && <Studio onClose={() => setStudio(false)} />}{login && <Login onClose={() => setLogin(false)} />}</div>;
}
