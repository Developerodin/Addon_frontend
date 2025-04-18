import Link from 'next/link'
 
export default function NotFound() {
  return (
    <>
    <html>
      <body>
      <p>The Above Url Cannot Found</p>
      <div className="error-search">
        <Link href="/dashboards/main" className='btn btn-primary'>Return Home</Link>
      </div>
      </body>
    </html>
    </>
  )
}