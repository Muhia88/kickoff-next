import Image from 'next/image';

export default function DebugImagesPage() {
    return (
        <div className="p-8 space-y-8 bg-gray-100 min-h-screen">
            <h1 className="text-2xl font-bold">Image Debugging</h1>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">1. Standard &lt;img&gt; Tag (Hero Background)</h2>
                <div className="border p-2 bg-white">
                    <p>Src: /assets/background_alcohol.jpg</p>
                    <img
                        src="/assets/background_alcohol.jpg"
                        alt="Hero Background"
                        className="w-64 h-64 object-cover border-2 border-red-500"
                    />
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">2. Standard &lt;img&gt; Tag (Category: Whiskey)</h2>
                <div className="border p-2 bg-white">
                    <p>Src: /whiskey/jack_daniels.png</p>
                    <img
                        src="/whiskey/jack_daniels.png"
                        alt="Jack Daniels"
                        className="w-64 h-64 object-cover border-2 border-blue-500"
                    />
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">3. Next.js &lt;Image&gt; Tag (Category: Whiskey)</h2>
                <div className="border p-2 bg-white">
                    <p>Using next/image with width/height</p>
                    <Image
                        src="/whiskey/jack_daniels.png"
                        alt="Jack Daniels Next"
                        width={200}
                        height={200}
                        className="border-2 border-green-500"
                    />
                </div>
            </section>
        </div>
    );
}
